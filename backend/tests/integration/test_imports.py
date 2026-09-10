"""Importacion manual del CSV de ATSM (RF-08)."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import func, select

from ola.db.models import AnomalyReading, Laboratory

CABECERA = "FECHA_MEDICION,LABORATORIO_COSTERO,ANOMALIA_TEMPERATURA"
DATASET_REAL = Path("/dataset/IMARPE_Anomalia_TSM.csv")


def subir(client, headers, contenido: bytes | str, nombre: str = "atsm.csv"):
    datos = contenido.encode("utf-8") if isinstance(contenido, str) else contenido
    return client.post("/api/imports", headers=headers, files={"file": (nombre, datos, "text/csv")})


def csv_de(*lineas: str) -> str:
    return "\n".join([CABECERA, *lineas]) + "\n"


class TestPermisos:
    def test_un_anonimo_no_puede_importar(self, client):
        assert subir(client, {}, csv_de()).status_code == 401

    def test_un_usuario_normal_no_puede_importar(self, client, user_headers):
        assert subir(client, user_headers, csv_de()).status_code == 403

    def test_el_administrador_si_puede(self, client, admin_headers):
        assert subir(client, admin_headers, csv_de()).status_code == 201

    def test_el_historial_es_solo_para_administradores(self, client, user_headers):
        assert client.get("/api/imports", headers=user_headers).status_code == 403


class TestImportacion:
    def test_carga_las_filas_validas(self, client, admin_headers, db_session):
        r = subir(client, admin_headers, csv_de("2026-07-31,CALLAO,1.5", "2026-07-30,PISCO,-0.8"))
        cuerpo = r.json()

        assert cuerpo["status"] == "completed"
        assert cuerpo["rows_total"] == 2
        assert cuerpo["rows_inserted"] == 2
        assert cuerpo["rows_rejected"] == 0
        assert db_session.scalar(select(func.count()).select_from(AnomalyReading)) == 2

    def test_conserva_los_cuatro_decimales_del_dataset(self, client, admin_headers, db_session):
        subir(client, admin_headers, csv_de("2026-07-31,CALLAO,-1.9048"))
        valor = db_session.scalar(select(AnomalyReading.anomaly_c))
        assert valor == Decimal("-1.9048")

    def test_lee_un_archivo_con_marca_de_orden_de_bytes(self, client, admin_headers):
        contenido = ("﻿" + csv_de("2026-07-31,CALLAO,1.5")).encode("utf-8")
        r = subir(client, admin_headers, contenido)
        assert r.json()["rows_inserted"] == 1

    def test_registra_quien_subio_el_archivo(self, client, admin_headers):
        r = subir(client, admin_headers, csv_de("2026-07-31,CALLAO,1.5"))
        assert r.json()["uploaded_by_email"] == "admin@ola.pe"

    def test_guarda_el_hash_y_el_tamano_del_archivo(self, client, admin_headers):
        cuerpo = subir(client, admin_headers, csv_de("2026-07-31,CALLAO,1.5")).json()
        assert len(cuerpo["sha256"]) == 64
        assert cuerpo["byte_size"] > 0

    def test_rechaza_un_archivo_que_no_sea_csv(self, client, admin_headers):
        r = subir(client, admin_headers, csv_de(), nombre="datos.xlsx")
        assert r.status_code == 415


class TestReimportacion:
    """IMARPE corrige mediciones de forma retroactiva, asi que reimportar el
    archivo es la via normal para incorporar esas correcciones.
    """

    def test_reimportar_lo_mismo_no_cambia_nada(self, client, admin_headers, db_session):
        contenido = csv_de("2026-07-31,CALLAO,1.5", "2026-07-30,PISCO,-0.8")
        subir(client, admin_headers, contenido)
        cuerpo = subir(client, admin_headers, contenido).json()

        assert cuerpo["rows_inserted"] == 0
        assert cuerpo["rows_updated"] == 0
        assert cuerpo["rows_unchanged"] == 2
        assert db_session.scalar(select(func.count()).select_from(AnomalyReading)) == 2

    def test_un_valor_corregido_se_actualiza(self, client, admin_headers, db_session):
        subir(client, admin_headers, csv_de("2026-07-31,CALLAO,1.5"))
        cuerpo = subir(client, admin_headers, csv_de("2026-07-31,CALLAO,2.7")).json()

        assert cuerpo["rows_updated"] == 1
        assert cuerpo["rows_inserted"] == 0
        assert db_session.scalar(select(AnomalyReading.anomaly_c)) == Decimal("2.7")

    def test_no_duplica_la_medicion_al_corregirla(self, client, admin_headers, db_session):
        subir(client, admin_headers, csv_de("2026-07-31,CALLAO,1.5"))
        subir(client, admin_headers, csv_de("2026-07-31,CALLAO,2.7"))
        assert db_session.scalar(select(func.count()).select_from(AnomalyReading)) == 1

    def test_una_fecha_repetida_dentro_del_archivo_no_rompe_la_carga(
        self, client, admin_headers, db_session
    ):
        # Sin deduplicar, PostgreSQL aborta con "cannot affect row a second time".
        r = subir(client, admin_headers, csv_de("2026-07-31,CALLAO,1.5", "2026-07-31,CALLAO,2.7"))
        assert r.json()["status"] == "completed"
        assert db_session.scalar(select(func.count()).select_from(AnomalyReading)) == 1


class TestImportacionParcial:
    """Descartar 125 mil filas correctas por unas pocas erroneas dejaria el
    sistema sin datos, asi que la importacion es parcial y reporta el detalle.
    """

    def test_las_filas_validas_entran_y_las_malas_se_reportan(
        self, client, admin_headers, db_session
    ):
        cuerpo = subir(
            client,
            admin_headers,
            csv_de(
                "2026-07-31,CALLAO,1.5",
                "fecha-mala,CALLAO,2.0",
                "2026-07-30,HUANCHACO,3.0",
                "2026-07-29,PISCO,NaN",
                "2026-07-28,PISCO,-0.9",
            ),
        ).json()

        assert cuerpo["rows_total"] == 5
        assert cuerpo["rows_inserted"] == 2
        assert cuerpo["rows_rejected"] == 3
        assert db_session.scalar(select(func.count()).select_from(AnomalyReading)) == 2

    def test_el_reporte_explica_cada_rechazo_con_su_linea(self, client, admin_headers):
        cuerpo = subir(
            client, admin_headers, csv_de("2026-07-31,CALLAO,1.5", "fecha-mala,CALLAO,2.0")
        ).json()

        muestra = cuerpo["error_sample"]
        assert len(muestra) == 1
        assert muestra[0]["line"] == 3
        assert "Fecha invalida" in muestra[0]["reason"]

    def test_un_laboratorio_desconocido_no_crea_una_zona_nueva(
        self, client, admin_headers, db_session
    ):
        # El diccionario oficial nombra HUANCHACO, que no existe en los datos.
        # Crearlo solo dejaria el mapa del RF-04 con 11 zonas.
        subir(client, admin_headers, csv_de("2026-07-31,HUANCHACO,1.5"))
        assert db_session.scalar(select(func.count()).select_from(Laboratory)) == 10


class TestArchivoInvalido:
    def test_una_cabecera_equivocada_invalida_todo_el_archivo(
        self, client, admin_headers, db_session
    ):
        r = subir(client, admin_headers, "fecha,lugar,valor\n2026-07-31,CALLAO,1.5\n")
        cuerpo = r.json()

        assert cuerpo["status"] == "failed"
        assert "FECHA_MEDICION" in cuerpo["error_message"]
        assert db_session.scalar(select(func.count()).select_from(AnomalyReading)) == 0

    def test_un_archivo_vacio_se_rechaza(self, client, admin_headers):
        assert subir(client, admin_headers, "").json()["status"] == "failed"

    def test_el_intento_fallido_queda_registrado(self, client, admin_headers):
        subir(client, admin_headers, "fecha,lugar,valor\n")
        historial = client.get("/api/imports", headers=admin_headers).json()
        assert len(historial) == 1
        assert historial[0]["status"] == "failed"


class TestHistorial:
    def test_lista_las_importaciones_de_la_mas_reciente_a_la_mas_antigua(
        self, client, admin_headers
    ):
        subir(client, admin_headers, csv_de("2026-07-30,CALLAO,1.0"), nombre="primera.csv")
        subir(client, admin_headers, csv_de("2026-07-31,CALLAO,1.5"), nombre="segunda.csv")

        historial = client.get("/api/imports", headers=admin_headers).json()
        assert [h["filename"] for h in historial] == ["segunda.csv", "primera.csv"]

    def test_permite_consultar_una_importacion_concreta(self, client, admin_headers):
        creada = subir(client, admin_headers, csv_de("2026-07-31,CALLAO,1.5")).json()
        detalle = client.get(f"/api/imports/{creada['id']}", headers=admin_headers).json()
        assert detalle["id"] == creada["id"]

    def test_una_importacion_inexistente_responde_404(self, client, admin_headers):
        assert client.get("/api/imports/9999", headers=admin_headers).status_code == 404


class TestCatalogo:
    def test_expone_las_diez_zonas_del_rf04(self, client):
        zonas = client.get("/api/laboratories").json()
        assert len(zonas) == 10

    def test_las_ordena_de_norte_a_sur(self, client):
        zonas = client.get("/api/laboratories").json()
        assert zonas[0]["code"] == "TUMBES"
        assert zonas[-1]["code"] == "ILO"

    def test_cada_zona_trae_coordenadas_para_el_mapa(self, client):
        for zona in client.get("/api/laboratories").json():
            assert zona["latitude"] is not None
            assert zona["longitude"] is not None

    def test_incluye_matarani_aunque_este_descontinuado(self, client):
        codigos = [z["code"] for z in client.get("/api/laboratories").json()]
        assert "MATARANI" in codigos

    def test_consulta_una_zona_por_codigo_sin_distinguir_mayusculas(self, client):
        assert client.get("/api/laboratories/callao").json()["code"] == "CALLAO"

    def test_una_zona_inexistente_responde_404(self, client):
        assert client.get("/api/laboratories/HUANCHACO").status_code == 404


class TestDatasetDeMuestra:
    def test_carga_el_dataset_reducido_de_las_pruebas(
        self, client, admin_headers, sample_csv_bytes, db_session
    ):
        cuerpo = subir(client, admin_headers, sample_csv_bytes, nombre="sample_atsm.csv").json()

        assert cuerpo["status"] == "completed"
        assert cuerpo["rows_rejected"] == 0
        assert cuerpo["rows_inserted"] == cuerpo["rows_total"]
        # Las 10 zonas deben quedar representadas para poder probar el mapa.
        zonas = db_session.scalar(select(func.count(func.distinct(AnomalyReading.laboratory_id))))
        assert zonas == 10


@pytest.mark.slow
class TestDatasetCompleto:
    """Comprueba el requisito de rendimiento de la SRS con el archivo real."""

    def test_importa_las_125_mil_filas_dentro_del_limite(self, client, admin_headers, db_session):
        if not DATASET_REAL.exists():
            pytest.skip("El dataset real no esta montado en /dataset")

        cuerpo = subir(
            client, admin_headers, DATASET_REAL.read_bytes(), nombre="IMARPE_Anomalia_TSM.csv"
        ).json()

        assert cuerpo["status"] == "completed"
        assert cuerpo["rows_total"] == 125_701
        assert cuerpo["rows_rejected"] == 0
        # La SRS pide menos de 2 minutos para un ano de historico; aqui son 56.
        assert cuerpo["duration_ms"] < 120_000
