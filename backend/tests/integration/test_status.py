"""Estado termico vigente de las zonas (RF-01, RF-04)."""

from __future__ import annotations

import pytest

from ola.services import alert_service


@pytest.fixture
def estado(client, datos_de_muestra, db_session, config_por_defecto):
    alert_service.evaluate(db_session, config_por_defecto)
    return client.get("/api/status").json()


def zona(estado: dict, code: str) -> dict:
    return next(z for z in estado["zones"] if z["laboratory"]["code"] == code)


class TestFechaDeReferencia:
    def test_es_la_del_dato_mas_reciente_y_no_la_de_hoy(self, estado):
        # Si se usara el reloj del servidor, el mapa entero saldria en gris.
        assert estado["reference_date"] == "2026-07-31"

    def test_sin_mediciones_no_hay_fecha_de_referencia(self, client):
        respuesta = client.get("/api/status").json()
        assert respuesta["reference_date"] is None
        assert len(respuesta["zones"]) == 10
        assert all(z["state"] == "no_data" for z in respuesta["zones"])

    def test_permite_consultar_el_estado_en_una_fecha_pasada(self, client, datos_de_muestra):
        respuesta = client.get("/api/status", params={"as_of": "2026-07-20"}).json()
        assert respuesta["reference_date"] == "2026-07-20"


class TestZonas:
    def test_devuelve_siempre_las_diez_zonas(self, estado):
        assert len(estado["zones"]) == 10

    def test_las_ordena_de_norte_a_sur(self, estado):
        codigos = [z["laboratory"]["code"] for z in estado["zones"]]
        assert codigos[0] == "TUMBES"
        assert codigos[-1] == "ILO"

    def test_cada_zona_trae_coordenadas_para_el_mapa(self, estado):
        for z in estado["zones"]:
            assert z["laboratory"]["latitude"] is not None
            assert z["laboratory"]["longitude"] is not None


class TestClasificacion:
    def test_una_zona_calida_se_marca_como_calida(self, estado):
        assert zona(estado, "CALLAO")["state"] == "warm"

    def test_una_zona_fria_se_marca_como_fria(self, estado):
        assert zona(estado, "PISCO")["state"] == "cold"

    def test_una_zona_neutra_se_marca_como_neutra(self, estado):
        assert zona(estado, "TUMBES")["state"] == "neutral"

    def test_los_valores_en_el_umbral_exacto_quedan_neutros(self, estado):
        # ILO alterna +0.5 y -0.5: el promedio queda dentro del rango neutro.
        assert zona(estado, "ILO")["state"] == "neutral"

    def test_el_color_sale_del_promedio_y_no_de_la_ultima_medicion(self, estado):
        # Sin promediar, un solo dia atipico haria parpadear la zona.
        callao = zona(estado, "CALLAO")
        assert callao["average_c"] is not None
        assert callao["average_c"] != callao["last_anomaly_c"]


class TestDatosSinVigencia:
    def test_una_zona_descontinuada_queda_sin_datos_recientes(self, estado):
        matarani = zona(estado, "MATARANI")
        assert matarani["state"] == "no_data"
        assert matarani["is_stale"] is True
        assert matarani["last_measured_on"] == "2016-12-31"

    def test_informa_cuantos_dias_lleva_sin_medicion(self, estado):
        assert zona(estado, "MATARANI")["days_since_last"] > 3000

    def test_diez_dias_sin_datos_superan_la_ventana_de_siete(self, estado):
        # PAITA deja de medir 10 dias antes de la fecha de referencia.
        paita = zona(estado, "PAITA")
        assert paita["days_since_last"] == 10
        assert paita["is_stale"] is True
        assert paita["state"] == "no_data"

    def test_una_zona_obsoleta_nunca_muestra_alerta(self, estado):
        assert zona(estado, "MATARANI")["open_alert"] is None


class TestAlertaVigente:
    def test_una_zona_en_racha_muestra_su_alerta(self, estado):
        alerta = zona(estado, "CALLAO")["open_alert"]
        assert alerta is not None
        assert alerta["state"] == "warm"
        assert alerta["streak_length"] == 6

    def test_una_zona_calida_sin_racha_suficiente_no_muestra_alerta(self, estado):
        # HUACHO esta calido pero solo acumula 4 registros seguidos.
        huacho = zona(estado, "HUACHO")
        assert huacho["state"] == "warm"
        assert huacho["open_alert"] is None

    def test_el_estado_es_publico(self, client):
        assert client.get("/api/status").status_code == 200
