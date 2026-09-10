"""Proyeccion de tendencia a corto plazo (RF-02)."""

from __future__ import annotations

import pytest


def proyeccion(client, code: str, **params) -> dict:
    return client.get(f"/api/laboratories/{code}/projection", params=params).json()


class TestDosMetodos:
    """La SRS admite regresion lineal o media movil ponderada; se implementan
    las dos para poder compararlas.
    """

    def test_devuelve_las_dos_estimaciones(self, client, datos_de_muestra):
        datos = proyeccion(client, "CALLAO")
        assert datos["linear"] is not None
        assert datos["weighted"] is not None

    def test_cada_metodo_se_identifica(self, client, datos_de_muestra):
        datos = proyeccion(client, "CALLAO")
        assert datos["linear"]["method"] == "linear_regression"
        assert datos["weighted"]["method"] == "weighted_moving_average"

    def test_informa_cuanto_difieren_las_dos_estimaciones(self, client, datos_de_muestra):
        # Que difieran es una senal de incertidumbre, no un fallo.
        datos = proyeccion(client, "CALLAO")
        assert datos["agreement_c"] is not None
        assert float(datos["agreement_c"]) >= 0

    def test_ambas_clasifican_su_valor_final(self, client, datos_de_muestra):
        datos = proyeccion(client, "CALLAO")
        assert datos["linear"]["final_state"] in {"warm", "neutral", "cold"}
        assert datos["weighted"]["final_state"] in {"warm", "neutral", "cold"}

    def test_una_zona_calida_proyecta_valores_calidos(self, client, datos_de_muestra):
        # CALLAO termina con seis registros calidos seguidos.
        datos = proyeccion(client, "CALLAO")
        assert datos["linear"]["final_state"] == "warm"

    def test_un_enfriamiento_reciente_lo_detecta_antes_la_regresion(
        self, client, datos_de_muestra
    ):
        """Este contraste es la razon de mostrar los dos metodos.

        PISCO lleva seis registros frios tras semanas neutras. La regresion ve
        la tendencia y proyecta frio; la media ponderada, que promedia treinta
        dias, todavia lee neutro porque el episodio es reciente.
        """
        datos = proyeccion(client, "PISCO")
        assert datos["linear"]["final_state"] == "cold"
        assert datos["weighted"]["final_state"] == "neutral"
        assert float(datos["linear"]["final_value"]) < float(datos["weighted"]["final_value"])


class TestHorizonte:
    def test_el_horizonte_por_defecto_es_de_cinco_dias(self, client, datos_de_muestra):
        datos = proyeccion(client, "CALLAO")
        assert datos["horizon_days"] == 5
        assert len(datos["linear"]["points"]) == 5

    @pytest.mark.parametrize("horizonte", [3, 4, 5, 6, 7])
    def test_admite_todo_el_rango_que_permite_la_srs(self, client, datos_de_muestra, horizonte):
        datos = proyeccion(client, "CALLAO", horizon=horizonte)
        assert len(datos["linear"]["points"]) == horizonte
        assert len(datos["weighted"]["points"]) == horizonte

    @pytest.mark.parametrize("horizonte", [0, 2, 8, 30])
    def test_rechaza_horizontes_fuera_del_rango(self, client, datos_de_muestra, horizonte):
        r = client.get("/api/laboratories/CALLAO/projection", params={"horizon": horizonte})
        assert r.status_code == 422

    def test_las_fechas_siguen_al_ultimo_dato_de_la_zona(self, client, datos_de_muestra):
        datos = proyeccion(client, "CALLAO", horizon=3)
        fechas = [p["projected_on"] for p in datos["linear"]["points"]]
        assert fechas == ["2026-08-01", "2026-08-02", "2026-08-03"]


class TestConfianza:
    def test_una_zona_al_dia_con_serie_densa_da_confianza_alta(self, client, datos_de_muestra):
        assert proyeccion(client, "CALLAO")["confidence"] == "high"

    def test_una_zona_descontinuada_da_confianza_baja(self, client, datos_de_muestra):
        assert proyeccion(client, "MATARANI")["confidence"] == "low"

    def test_una_zona_con_el_dato_atrasado_da_confianza_baja(self, client, datos_de_muestra):
        # PAITA deja de medir 10 dias antes de la fecha de referencia.
        assert proyeccion(client, "PAITA")["confidence"] == "low"

    def test_informa_cuantos_dias_de_retraso_lleva_el_dato(self, client, datos_de_muestra):
        assert proyeccion(client, "MATARANI")["days_behind"] > 3000
        assert proyeccion(client, "CALLAO")["days_behind"] == 0


class TestZonaSinDatosRecientes:
    """Se proyecta igualmente, avisando de la baja confianza."""

    def test_una_zona_descontinuada_si_se_proyecta(self, client, datos_de_muestra):
        datos = proyeccion(client, "MATARANI")
        assert datos["linear"] is not None
        assert datos["unavailable_reason"] is None

    def test_proyecta_desde_su_propio_ultimo_dato(self, client, datos_de_muestra):
        # Las fechas proyectadas delatan por si solas que la serie esta vieja.
        datos = proyeccion(client, "MATARANI")
        assert datos["last_measured_on"] == "2016-12-31"
        assert datos["linear"]["points"][0]["projected_on"].startswith("2017-01")

    def test_sin_mediciones_no_hay_proyeccion_y_se_explica(self, client):
        # Base sin datos importados.
        datos = proyeccion(client, "CALLAO")
        assert datos["linear"] is None
        assert datos["weighted"] is None
        assert "mediciones" in datos["unavailable_reason"]


class TestContexto:
    def test_devuelve_el_historico_reciente_junto_a_la_estimacion(
        self, client, datos_de_muestra
    ):
        # El grafico necesita mostrar de donde sale la proyeccion.
        datos = proyeccion(client, "CALLAO")
        assert len(datos["history"]) > 0
        assert "measured_on" in datos["history"][0]

    def test_el_historico_termina_donde_empieza_la_proyeccion(self, client, datos_de_muestra):
        datos = proyeccion(client, "CALLAO")
        assert datos["history"][-1]["measured_on"] == datos["last_measured_on"]

    def test_indica_la_ventana_usada_para_ajustar(self, client, datos_de_muestra):
        assert proyeccion(client, "CALLAO", window=15)["window"] == 15


class TestErrores:
    def test_una_zona_inexistente_responde_404(self, client, datos_de_muestra):
        assert (
            client.get("/api/laboratories/HUANCHACO/projection").status_code == 404
        )

    def test_la_consulta_es_publica(self, client, datos_de_muestra):
        assert client.get("/api/laboratories/CALLAO/projection").status_code == 200

    @pytest.mark.parametrize("ventana", [1, 4, 500])
    def test_rechaza_ventanas_fuera_de_rango(self, client, datos_de_muestra, ventana):
        r = client.get("/api/laboratories/CALLAO/projection", params={"window": ventana})
        assert r.status_code == 422
