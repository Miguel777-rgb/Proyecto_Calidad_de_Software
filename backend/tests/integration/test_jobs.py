"""Tareas programadas contra la base de pruebas: importacion por URL y envio."""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from ola.db.models import AlertEvent, ImportRun
from ola.jobs import advisory_lock, import_from_url, send_pending_notices
from ola.mail import RecordingMailer
from ola.services.channels import default_channels

URL = "https://datos.ejemplo.pe/IMARPE_Anomalia_TSM.csv"
CABECERA = "FECHA_MEDICION,LABORATORIO_COSTERO,ANOMALIA_TEMPERATURA\n"
RACHA = CABECERA + "".join(f"2026-07-{dia},CALLAO,1.5\n" for dia in range(27, 32))


def fuente(contenido: str = RACHA):
    def _descargar(url: str) -> bytes:
        assert url == URL
        return contenido.encode("utf-8")

    return _descargar


@pytest.fixture
def ajustes(settings_factory):
    return settings_factory()


def contar(db_session, modelo) -> int:
    return db_session.scalar(select(func.count()).select_from(modelo))


class TestImportacionPorUrl:
    def test_importa_y_reevalua_sin_intervencion(self, db_session, ajustes):
        run = import_from_url(db_session, ajustes, URL, fetch=fuente())

        assert run is not None
        assert run.rows_inserted == 5
        assert run.filename == "IMARPE_Anomalia_TSM.csv"
        assert run.uploaded_by_id is None
        assert contar(db_session, AlertEvent) == 1

    def test_si_la_fuente_no_cambio_no_registra_otra_importacion(self, db_session, ajustes):
        import_from_url(db_session, ajustes, URL, fetch=fuente())

        assert import_from_url(db_session, ajustes, URL, fetch=fuente()) is None
        assert contar(db_session, ImportRun) == 1

    def test_si_la_fuente_cambio_vuelve_a_importar(self, db_session, ajustes):
        import_from_url(db_session, ajustes, URL, fetch=fuente())
        run = import_from_url(
            db_session, ajustes, URL, fetch=fuente(RACHA + "2026-08-01,CALLAO,1.6\n")
        )

        assert run is not None
        assert run.rows_inserted == 1
        assert contar(db_session, ImportRun) == 2


class TestEnvioProgramado:
    def test_envia_los_avisos_que_dejo_la_importacion(
        self, client, db_session, ajustes, user_headers, normal_user
    ):
        client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"})
        import_from_url(db_session, ajustes, URL, fetch=fuente())
        correo = RecordingMailer()

        resumen = send_pending_notices(db_session, default_channels(correo))

        assert resumen.sent == 1
        assert [mensaje.to for mensaje in correo.sent] == [normal_user.email]

    def test_sin_pendientes_no_envia_nada(self, db_session):
        correo = RecordingMailer()
        assert send_pending_notices(db_session, default_channels(correo)).attempted == 0
        assert correo.sent == []


class TestBloqueo:
    def test_dos_procesos_no_toman_la_misma_tarea(self, engine):
        with advisory_lock(engine, 4242) as primero, advisory_lock(engine, 4242) as segundo:
            assert primero is True
            assert segundo is False

    def test_el_bloqueo_se_libera_al_terminar(self, engine):
        with advisory_lock(engine, 4243) as primero:
            assert primero is True
        with advisory_lock(engine, 4243) as otra_vez:
            assert otra_vez is True
