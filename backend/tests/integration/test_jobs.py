"""Tareas programadas contra la base de pruebas: importacion por URL y envio."""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from ola.db.models import AlertEvent, ImportRun
from ola.jobs import (
    advisory_lock,
    describe_import,
    import_exit_code,
    import_file,
    import_from_url,
    send_pending_notices,
)
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


class TestImportacionDeArchivo:
    """python -m ola.jobs import-file: carga el dataset sin pasar por la web (CI)."""

    def test_importa_el_archivo_y_reevalua(self, db_session, ajustes, tmp_path):
        ruta = tmp_path / "IMARPE_Anomalia_TSM.csv"
        ruta.write_text(RACHA, encoding="utf-8")

        run = import_file(db_session, ajustes, ruta)

        assert run is not None
        assert run.rows_inserted == 5
        assert run.filename == "IMARPE_Anomalia_TSM.csv"
        assert run.uploaded_by_id is None
        assert contar(db_session, AlertEvent) == 1
        assert import_exit_code(run) == 0
        assert describe_import(run) == (
            "IMARPE_Anomalia_TSM.csv: 5 filas nuevas, 0 actualizadas, 0 sin cambios y 0 rechazadas."
        )

    def test_el_mismo_archivo_no_se_importa_dos_veces(self, db_session, ajustes, tmp_path):
        ruta = tmp_path / "atsm.csv"
        ruta.write_text(RACHA, encoding="utf-8")
        import_file(db_session, ajustes, ruta)

        segunda = import_file(db_session, ajustes, ruta)

        assert segunda is None
        assert contar(db_session, ImportRun) == 1
        assert import_exit_code(segunda) == 0
        assert describe_import(segunda) == "Sin cambios desde la ultima importacion."

    def test_un_archivo_rechazado_entero_termina_con_error(self, db_session, ajustes, tmp_path):
        ruta = tmp_path / "otro.csv"
        ruta.write_text("fecha,lugar,valor\n2026-07-01,CALLAO,1.5\n", encoding="utf-8")

        run = import_file(db_session, ajustes, ruta)

        assert run is not None
        assert run.rows_inserted == 0
        assert contar(db_session, AlertEvent) == 0
        # Asi la CI se detiene en vez de correr las pruebas sin datos.
        assert import_exit_code(run) == 1
        assert describe_import(run).startswith("La importacion de otro.csv fallo:")

    @pytest.mark.parametrize(
        "filas",
        ["", "fecha-mala,CALLAO,1.5\n2026-07-01,NO_EXISTE,1.0\n"],
        ids=["solo-cabecera", "todas-invalidas"],
    )
    def test_un_archivo_sin_filas_validas_termina_con_error(
        self, db_session, ajustes, tmp_path, filas
    ):
        # La cabecera es correcta, asi que la importacion termina, pero no
        # carga nada: para la CI es tan grave como un archivo rechazado.
        ruta = tmp_path / "atsm.csv"
        ruta.write_text(CABECERA + filas, encoding="utf-8")

        run = import_file(db_session, ajustes, ruta)

        assert run is not None
        assert run.rows_inserted + run.rows_updated + run.rows_unchanged == 0
        assert import_exit_code(run) == 1

    def test_repetir_un_archivo_sin_filas_validas_vuelve_a_fallar(
        self, db_session, ajustes, tmp_path
    ):
        # El mismo archivo no se salta como «sin cambios»: nunca cargo nada.
        ruta = tmp_path / "atsm.csv"
        ruta.write_text(CABECERA, encoding="utf-8")
        import_file(db_session, ajustes, ruta)

        segunda = import_file(db_session, ajustes, ruta)

        assert segunda is not None
        assert import_exit_code(segunda) == 1
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
