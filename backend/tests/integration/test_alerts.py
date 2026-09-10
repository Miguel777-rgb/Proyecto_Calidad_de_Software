"""Deteccion de tendencia sostenida sobre datos reales (RF-01).

Los casos siguen la tabla documentada en tests/fixtures/generar_muestra.py.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import func, select

from ola.db.models import AlertEvent, AlertState
from ola.services import alert_service

REFERENCIA = date(2026, 7, 31)


@pytest.fixture
def evaluado(db_session, datos_de_muestra, config_por_defecto):
    return alert_service.evaluate(db_session, config_por_defecto)


def alertas_abiertas(client) -> dict[str, dict]:
    eventos = client.get("/api/alerts", params={"only_open": True}).json()
    return {e["laboratory_code"]: e for e in eventos}


class TestEvaluacion:
    def test_usa_la_fecha_del_dato_y_no_el_reloj(self, evaluado):
        # Si usara datetime.now(), la referencia seria la fecha real de hoy
        # y todas las zonas quedarian marcadas como obsoletas.
        assert evaluado.reference_date == REFERENCIA

    def test_evalua_las_diez_zonas(self, evaluado):
        assert evaluado.laboratories_evaluated == 10

    def test_sin_mediciones_no_hay_nada_que_evaluar(self, db_session, config_por_defecto):
        resumen = alert_service.evaluate(db_session, config_por_defecto)
        assert resumen.reference_date is None
        assert resumen.events_total == 0


class TestCasosDeRacha:
    """Cada caso corresponde a una fila de la tabla del generador."""

    def test_seis_registros_calidos_seguidos_generan_alerta(self, client, evaluado):
        alerta = alertas_abiertas(client)["CALLAO"]
        assert alerta["state"] == AlertState.WARM
        assert alerta["streak_length"] == 6
        assert alerta["ended_on"] == "2026-07-31"

    def test_seis_registros_frios_seguidos_generan_alerta(self, client, evaluado):
        alerta = alertas_abiertas(client)["PISCO"]
        assert alerta["state"] == AlertState.COLD

    def test_exactamente_el_minimo_de_registros_genera_alerta(self, client, evaluado):
        # SAN JOSE tiene justo 5 registros calidos seguidos.
        assert alertas_abiertas(client)["SAN JOSE"]["streak_length"] == 5

    def test_un_registro_por_debajo_del_minimo_no_genera_alerta(self, client, evaluado):
        # HUACHO tiene 4: se queda a uno del limite.
        assert "HUACHO" not in alertas_abiertas(client)

    def test_un_hueco_de_dos_dias_no_rompe_la_racha(self, client, evaluado):
        # CHICAMA tiene 7 registros calidos con dos dias faltantes en medio.
        alerta = alertas_abiertas(client)["CHICAMA"]
        assert alerta["streak_length"] == 7

    def test_un_hueco_de_cuatro_dias_rompe_la_racha(self, client, evaluado):
        # CHIMBOTE queda partido en trozos de 3 y 1 registro.
        assert "CHIMBOTE" not in alertas_abiertas(client)

    def test_una_zona_neutra_no_alerta(self, client, evaluado):
        assert "TUMBES" not in alertas_abiertas(client)

    def test_una_zona_sin_datos_recientes_no_alerta(self, client, evaluado):
        # MATARANI termina en 2016: no puede tener una tendencia vigente.
        assert "MATARANI" not in alertas_abiertas(client)


class TestIdempotencia:
    """Sin tarea programada, la evaluacion se dispara a mano y puede repetirse."""

    def test_evaluar_dos_veces_no_duplica_episodios(
        self, db_session, datos_de_muestra, config_por_defecto
    ):
        primera = alert_service.evaluate(db_session, config_por_defecto)
        segunda = alert_service.evaluate(db_session, config_por_defecto)

        assert primera.events_total == segunda.events_total
        assert segunda.events_removed == 0
        total = db_session.scalar(select(func.count()).select_from(AlertEvent))
        assert total == primera.events_total

    def test_conserva_el_identificador_del_episodio(
        self, db_session, datos_de_muestra, config_por_defecto
    ):
        # RF-03 depende de esto: si el id cambiara, se reenviaria la alerta.
        alert_service.evaluate(db_session, config_por_defecto)
        ids_antes = set(db_session.scalars(select(AlertEvent.id)))

        alert_service.evaluate(db_session, config_por_defecto)
        assert set(db_session.scalars(select(AlertEvent.id))) == ids_antes


class TestCambioDeParametros:
    def test_subir_el_umbral_reduce_los_episodios(
        self, client, db_session, datos_de_muestra, config_por_defecto, admin_headers
    ):
        from dataclasses import replace

        antes = alert_service.evaluate(db_session, config_por_defecto)
        exigente = replace(config_por_defecto, threshold_c=Decimal("2.0"))
        despues = alert_service.evaluate(db_session, exigente)

        assert despues.events_total < antes.events_total
        assert despues.events_removed > 0

    def test_cada_episodio_guarda_los_parametros_con_que_se_detecto(
        self, client, evaluado, db_session
    ):
        # Asi el historico queda auditable aunque luego cambien los umbrales.
        evento = db_session.scalars(select(AlertEvent)).first()
        assert evento is not None
        assert evento.threshold_c == Decimal("0.5")
        assert evento.min_streak_records == 5
        assert evento.max_gap_days == 2


class TestConsultaDeAlertas:
    def test_lista_los_episodios_de_una_zona(self, client, evaluado):
        eventos = client.get("/api/alerts", params={"lab": "CALLAO"}).json()
        assert eventos
        assert all(e["laboratory_code"] == "CALLAO" for e in eventos)

    def test_una_zona_inexistente_responde_404(self, client, evaluado):
        assert client.get("/api/alerts", params={"lab": "HUANCHACO"}).status_code == 404

    def test_calcula_las_rachas_de_una_zona_al_vuelo(self, client, datos_de_muestra):
        rachas = client.get("/api/laboratories/CALLAO/streaks").json()
        assert len(rachas) == 1
        assert rachas[0]["length"] == 6


class TestPermisos:
    def test_solo_el_administrador_puede_reevaluar(self, client, user_headers):
        assert client.post("/api/alerts/evaluate", headers=user_headers).status_code == 403

    def test_un_anonimo_no_puede_reevaluar(self, client):
        assert client.post("/api/alerts/evaluate").status_code == 401

    def test_consultar_alertas_es_publico(self, client):
        assert client.get("/api/alerts").status_code == 200
