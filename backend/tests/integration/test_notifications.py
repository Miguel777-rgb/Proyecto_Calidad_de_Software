"""Avisos a los usuarios suscritos (RF-03)."""

from __future__ import annotations

import pytest
from sqlalchemy import select, update

from ola.db.models import AlertEvent, Notification, NotificationStatus
from ola.mail import RecordingMailer
from ola.services import alert_service, notification_service


@pytest.fixture
def suscrito_a_callao(client, user_headers, normal_user):
    client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"})
    return normal_user


@pytest.fixture
def con_alerta(client, db_session, datos_de_muestra, config_por_defecto, suscrito_a_callao):
    """Evalua las alertas y registra los avisos, como hace el endpoint."""
    resumen = alert_service.evaluate(db_session, config_por_defecto)
    notification_service.create_for_events(
        db_session, opened_ids=resumen.opened_event_ids, closed_ids=resumen.closed_event_ids
    )
    return resumen


def avisos(db_session) -> list[Notification]:
    return list(db_session.scalars(select(Notification)))


class TestRegistroDeAvisos:
    def test_una_alerta_nueva_genera_avisos_para_el_suscrito(self, db_session, con_alerta):
        # CALLAO entra en alerta y el usuario esta suscrito.
        assert len(avisos(db_session)) == 2  # correo y aviso en la aplicacion

    def test_genera_un_aviso_por_canal(self, db_session, con_alerta):
        canales = {a.channel.value for a in avisos(db_session)}
        assert canales == {"email", "in_app"}

    def test_no_avisa_de_zonas_a_las_que_no_estoy_suscrito(self, db_session, con_alerta):
        # PISCO tambien entra en alerta, pero el usuario no la sigue.
        zonas = {a.alert_event.laboratory.code for a in avisos(db_session)}
        assert zonas == {"CALLAO"}

    def test_los_avisos_nacen_pendientes(self, db_session, con_alerta):
        assert all(a.status is NotificationStatus.PENDING for a in avisos(db_session))


class TestNoRepeticion:
    """La restriccion de unicidad es la que impide repetir un aviso."""

    def test_reevaluar_no_genera_avisos_nuevos(self, db_session, con_alerta, config_por_defecto):
        antes = len(avisos(db_session))
        resumen = alert_service.evaluate(db_session, config_por_defecto)
        creados = notification_service.create_for_events(
            db_session, opened_ids=resumen.opened_event_ids, closed_ids=resumen.closed_event_ids
        )
        assert creados == 0
        assert len(avisos(db_session)) == antes

    def test_registrar_dos_veces_los_mismos_episodios_no_duplica(self, db_session, con_alerta):
        abiertos = [e.id for e in db_session.scalars(select(AlertEvent).where(AlertEvent.is_open))]
        antes = len(avisos(db_session))
        assert notification_service.create_for_events(db_session, opened_ids=abiertos) == 0
        assert len(avisos(db_session)) == antes


class TestEnvio:
    def test_envia_los_correos_pendientes(self, db_session, con_alerta, mailer):
        resumen = notification_service.send_pending(db_session, mailer)

        assert resumen.sent == 1  # solo el canal de correo
        assert resumen.failed == 0
        assert len(mailer.sent) == 1

    def test_el_correo_va_al_usuario_suscrito(self, db_session, con_alerta, mailer):
        notification_service.send_pending(db_session, mailer)
        assert mailer.sent[0].to == "pescador@ejemplo.pe"

    def test_el_asunto_nombra_la_zona(self, db_session, con_alerta, mailer):
        notification_service.send_pending(db_session, mailer)
        assert "Callao" in mailer.sent[0].subject

    def test_no_reenvia_lo_ya_enviado(self, db_session, con_alerta, mailer):
        notification_service.send_pending(db_session, mailer)
        segundo = notification_service.send_pending(db_session, mailer)

        assert segundo.attempted == 0
        assert len(mailer.sent) == 1

    def test_los_avisos_en_la_aplicacion_no_generan_correo(self, db_session, con_alerta, mailer):
        notification_service.send_pending(db_session, mailer)
        assert len(mailer.sent) == 1
        assert len(avisos(db_session)) == 2


class TestFallosDeEnvio:
    """Un fallo no pierde el aviso: queda para reintentar."""

    def test_un_fallo_se_registra_con_su_motivo(self, db_session, con_alerta):
        roto = RecordingMailer(fail_with=OSError("servidor de correo no disponible"))
        resumen = notification_service.send_pending(db_session, roto)

        assert resumen.failed == 1
        fallido = next(a for a in avisos(db_session) if a.status is NotificationStatus.FAILED)
        assert "no disponible" in fallido.error

    def test_un_aviso_fallido_se_reintenta_en_el_siguiente_envio(
        self, db_session, con_alerta, mailer
    ):
        notification_service.send_pending(db_session, RecordingMailer(fail_with=OSError("caido")))
        resumen = notification_service.send_pending(db_session, mailer)

        assert resumen.sent == 1
        assert len(mailer.sent) == 1

    def test_al_reintentar_con_exito_se_limpia_el_error(self, db_session, con_alerta, mailer):
        notification_service.send_pending(db_session, RecordingMailer(fail_with=OSError("caido")))
        notification_service.send_pending(db_session, mailer)

        enviado = next(a for a in avisos(db_session) if a.status is NotificationStatus.SENT)
        assert enviado.error is None
        assert enviado.sent_at is not None

    def test_un_fallo_no_detiene_los_demas_envios(
        self, client, db_session, datos_de_muestra, config_por_defecto, user_headers, mailer
    ):
        for zona in ("CALLAO", "PISCO"):
            client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": zona})
        resumen = alert_service.evaluate(db_session, config_por_defecto)
        notification_service.create_for_events(db_session, opened_ids=resumen.opened_event_ids)

        envio = notification_service.send_pending(db_session, mailer)
        assert envio.attempted == 2
        assert envio.sent == 2


class TestCentroDeAvisos:
    def test_el_usuario_ve_sus_avisos_sin_leer(self, client, con_alerta, user_headers):
        datos = client.get("/api/notifications", headers=user_headers).json()
        assert datos["unread"] == 1
        assert datos["items"][0]["laboratory_code"] == "CALLAO"

    def test_el_aviso_describe_el_episodio(self, client, con_alerta, user_headers):
        aviso = client.get("/api/notifications", headers=user_headers).json()["items"][0]
        assert aviso["kind"] == "opened"
        assert aviso["alert_state"] == "warm"
        assert aviso["streak_length"] > 0

    def test_marcar_uno_como_leido(self, client, con_alerta, user_headers):
        aviso = client.get("/api/notifications", headers=user_headers).json()["items"][0]
        assert (
            client.post(f"/api/notifications/{aviso['id']}/read", headers=user_headers).status_code
            == 204
        )
        assert client.get("/api/notifications", headers=user_headers).json()["unread"] == 0

    def test_marcar_todos_como_leidos(self, client, con_alerta, user_headers):
        assert client.post("/api/notifications/read-all", headers=user_headers).status_code == 204
        assert client.get("/api/notifications", headers=user_headers).json()["unread"] == 0

    def test_no_se_puede_marcar_el_aviso_de_otro(
        self, client, con_alerta, admin_headers, user_headers
    ):
        aviso = client.get("/api/notifications", headers=user_headers).json()["items"][0]
        r = client.post(f"/api/notifications/{aviso['id']}/read", headers=admin_headers)
        assert r.status_code == 404

    def test_hace_falta_iniciar_sesion(self, client):
        assert client.get("/api/notifications").status_code == 401


class TestEndpointDeEnvio:
    def test_solo_el_administrador_puede_disparar_el_envio(self, client, user_headers):
        assert client.post("/api/notifications/send", headers=user_headers).status_code == 403

    def test_un_anonimo_no_puede(self, client):
        assert client.post("/api/notifications/send").status_code == 401

    def test_el_resumen_informa_del_resultado(self, client, con_alerta, admin_headers, mailer):
        datos = client.post("/api/notifications/send", headers=admin_headers).json()
        assert datos["attempted"] == 1
        assert datos["sent"] == 1
        assert datos["by_status"]["sent"] == 1

    def test_evaluar_registra_los_avisos_pero_no_los_envia(
        self, client, db_session, datos_de_muestra, admin_headers, user_headers, mailer
    ):
        client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"})
        db_session.execute(update(AlertEvent).values(is_open=False))
        db_session.commit()

        resumen = client.post("/api/alerts/evaluate", headers=admin_headers).json()
        assert resumen["notifications_created"] > 0
        # El correo no sale hasta el segundo paso.
        assert len(mailer.sent) == 0


class TestAvisoDeCierre:
    """Se avisa tambien cuando la zona vuelve a la normalidad."""

    @pytest.fixture
    def alerta_cerrada(self, db_session, con_alerta, config_por_defecto):
        """Anade una medicion neutra posterior, que corta la racha de CALLAO."""
        from datetime import date
        from decimal import Decimal

        from ola.db.models import AnomalyReading, Laboratory

        callao = db_session.scalar(select(Laboratory).where(Laboratory.code == "CALLAO"))
        db_session.add(
            AnomalyReading(
                laboratory_id=callao.id, measured_on=date(2026, 8, 1), anomaly_c=Decimal("0.1")
            )
        )
        db_session.commit()

        resumen = alert_service.evaluate(db_session, config_por_defecto)
        creados = notification_service.create_for_events(
            db_session, opened_ids=resumen.opened_event_ids, closed_ids=resumen.closed_event_ids
        )
        return resumen, creados

    def test_cerrar_una_alerta_genera_avisos(self, db_session, alerta_cerrada):
        _, creados = alerta_cerrada
        assert creados > 0
        cierres = [a for a in avisos(db_session) if a.kind.value == "closed"]
        assert len(cierres) == 2  # correo y aviso en la aplicacion

    def test_el_correo_de_cierre_anuncia_el_fin(self, db_session, alerta_cerrada, mailer):
        notification_service.send_pending(db_session, mailer)
        asuntos = [m.subject for m in mailer.sent]
        assert any("terminó la alerta" in a for a in asuntos)

    def test_el_centro_de_avisos_distingue_apertura_de_cierre(
        self, client, alerta_cerrada, user_headers
    ):
        items = client.get("/api/notifications", headers=user_headers).json()["items"]
        tipos = {i["kind"] for i in items}
        assert tipos == {"opened", "closed"}

    def test_no_se_repite_el_aviso_de_cierre(self, db_session, alerta_cerrada, config_por_defecto):
        resumen = alert_service.evaluate(db_session, config_por_defecto)
        creados = notification_service.create_for_events(
            db_session, opened_ids=resumen.opened_event_ids, closed_ids=resumen.closed_event_ids
        )
        assert creados == 0

    def test_un_episodio_eliminado_por_cambio_de_umbral_no_avisa_cierre(
        self, db_session, con_alerta, config_por_defecto
    ):
        # Subir el umbral borra episodios, pero eso no es que la zona haya
        # vuelto a la normalidad: es que se calcula distinto.
        from dataclasses import replace
        from decimal import Decimal

        exigente = replace(config_por_defecto, threshold_c=Decimal("9.0"))
        resumen = alert_service.evaluate(db_session, exigente)
        creados = notification_service.create_for_events(
            db_session, opened_ids=resumen.opened_event_ids, closed_ids=resumen.closed_event_ids
        )
        assert creados == 0


class TestSuscribirseAUnaAlertaVigente:
    """Quien se suscribe a una zona que YA esta en alerta debe enterarse."""

    @pytest.fixture
    def alertas_evaluadas(self, client, db_session, datos_de_muestra, config_por_defecto):
        return alert_service.evaluate(db_session, config_por_defecto)

    def test_recibe_el_aviso_al_suscribirse(
        self, client, db_session, alertas_evaluadas, user_headers
    ):
        # CALLAO ya tenia una alerta abierta antes de que existiera la
        # suscripcion; sin esto la persona no se enteraria hasta el cierre.
        client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"})
        assert len(avisos(db_session)) == 2

    def test_no_avisa_de_zonas_sin_alerta_vigente(
        self, client, db_session, alertas_evaluadas, user_headers
    ):
        # TUMBES esta neutra en el dataset de prueba.
        client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "TUMBES"})
        assert avisos(db_session) == []

    def test_darse_de_baja_y_volver_no_duplica_el_aviso(
        self, client, db_session, alertas_evaluadas, user_headers
    ):
        for _ in range(2):
            client.post(
                "/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"}
            )
            client.delete("/api/subscriptions/CALLAO", headers=user_headers)
        client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"})
        assert len(avisos(db_session)) == 2

    def test_el_correo_sale_en_el_siguiente_envio(
        self, client, db_session, alertas_evaluadas, user_headers, mailer
    ):
        client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"})
        notification_service.send_pending(db_session, mailer)
        assert len(mailer.sent) == 1
        assert "Callao" in mailer.sent[0].subject
