"""Series historicas y comparacion entre zonas (RF-05, RF-06)."""

from __future__ import annotations

import pytest


def serie(client, code: str, **params) -> dict:
    return client.get(f"/api/laboratories/{code}/readings", params=params).json()


def puntos(respuesta: dict, indice: int = 0) -> list[dict]:
    return respuesta["series"][indice]["points"]


class TestSerieDeUnaZona:
    def test_devuelve_la_serie_de_la_zona_pedida(self, client, datos_de_muestra):
        datos = serie(client, "CALLAO")
        assert len(datos["series"]) == 1
        assert datos["series"][0]["laboratory"]["code"] == "CALLAO"

    def test_el_rango_por_defecto_son_90_dias(self, client, datos_de_muestra):
        datos = serie(client, "CALLAO")
        assert datos["since"] == "2026-05-03"
        assert datos["until"] == "2026-07-31"
        assert len(puntos(datos)) == 90

    def test_el_rango_por_defecto_parte_del_dato_y_no_del_reloj(self, client, datos_de_muestra):
        # Si usara la fecha de hoy, el rango no terminaria en el ultimo dato.
        assert serie(client, "CALLAO")["until"] == "2026-07-31"

    def test_respeta_el_rango_pedido(self, client, datos_de_muestra):
        datos = serie(client, "CALLAO", **{"from": "2026-07-01", "to": "2026-07-10"})
        assert datos["since"] == "2026-07-01"
        assert len(puntos(datos)) == 10

    def test_una_zona_inexistente_responde_404(self, client, datos_de_muestra):
        assert client.get("/api/laboratories/HUANCHACO/readings").status_code == 404

    def test_un_rango_invertido_se_rechaza(self, client, datos_de_muestra):
        r = client.get(
            "/api/laboratories/CALLAO/readings",
            params={"from": "2026-07-31", "to": "2026-07-01"},
        )
        assert r.status_code == 422

    def test_la_consulta_es_publica(self, client, datos_de_muestra):
        assert client.get("/api/laboratories/CALLAO/readings").status_code == 200


class TestResolucionAutomatica:
    """El usuario no elige: pedir dato diario de 56 anos son mas de 20 mil
    puntos y el grafico se vuelve inmanejable.
    """

    @pytest.mark.parametrize(
        ("desde", "hasta", "esperada"),
        [
            ("2026-05-01", "2026-07-31", "daily"),
            ("2025-08-01", "2026-07-31", "daily"),
            ("2022-01-01", "2026-07-31", "weekly"),
            ("1970-01-01", "2026-07-31", "monthly"),
        ],
    )
    def test_elige_la_resolucion_segun_el_rango(
        self, client, datos_de_muestra, desde, hasta, esperada
    ):
        datos = serie(client, "CALLAO", **{"from": desde, "to": hasta})
        assert datos["resolution"] == esperada

    def test_el_historico_completo_cabe_en_pocos_cientos_de_puntos(self, client, datos_de_muestra):
        datos = serie(client, "CALLAO", **{"from": "1970-01-01", "to": "2026-07-31"})
        assert len(puntos(datos)) < 1000

    def test_el_promedio_semanal_agrupa_varios_dias(self, client, datos_de_muestra):
        datos = serie(client, "CALLAO", **{"from": "2022-01-01", "to": "2026-07-31"})
        con_dato = [p for p in puntos(datos) if p["anomaly_c"] is not None]
        assert any(p["samples"] > 1 for p in con_dato)


class TestHuecos:
    """Unir dos puntos separados por meses inventaria una tendencia que nadie
    midio, asi que los periodos sin dato se marcan y el grafico corta la linea.
    """

    def test_los_periodos_sin_medicion_llegan_como_nulos(self, client, datos_de_muestra):
        # PAITA deja de medir 10 dias antes del final del rango.
        datos = serie(client, "PAITA")
        assert any(p["anomaly_c"] is None for p in puntos(datos))

    def test_la_serie_cubre_el_rango_completo_aunque_falten_datos(self, client, datos_de_muestra):
        datos = serie(client, "MATARANI", **{"from": "2026-05-03", "to": "2026-07-31"})
        assert len(puntos(datos)) == 90
        assert all(p["anomaly_c"] is None for p in puntos(datos))

    def test_los_periodos_con_dato_indican_cuantas_mediciones_promedian(
        self, client, datos_de_muestra
    ):
        con_dato = [p for p in puntos(serie(client, "CALLAO")) if p["anomaly_c"] is not None]
        assert all(p["samples"] >= 1 for p in con_dato)

    def test_los_periodos_sin_dato_no_promedian_nada(self, client, datos_de_muestra):
        sin_dato = [p for p in puntos(serie(client, "PAITA")) if p["anomaly_c"] is None]
        assert all(p["samples"] == 0 for p in sin_dato)


class TestComparacion:
    def test_devuelve_una_serie_por_zona(self, client, datos_de_muestra):
        datos = client.get("/api/readings/compare", params={"labs": "CALLAO,PISCO"}).json()
        assert [s["laboratory"]["code"] for s in datos["series"]] == ["CALLAO", "PISCO"]

    def test_todas_las_series_comparten_el_mismo_eje_temporal(self, client, datos_de_muestra):
        datos = client.get("/api/readings/compare", params={"labs": "CALLAO,MATARANI"}).json()
        ejes = [[p["period"] for p in s["points"]] for s in datos["series"]]
        assert ejes[0] == ejes[1]

    def test_admite_hasta_cuatro_zonas(self, client, datos_de_muestra):
        r = client.get("/api/readings/compare", params={"labs": "CALLAO,PISCO,ILO,PAITA"})
        assert r.status_code == 200
        assert len(r.json()["series"]) == 4

    def test_rechaza_mas_de_cuatro_zonas(self, client, datos_de_muestra):
        r = client.get("/api/readings/compare", params={"labs": "CALLAO,PISCO,ILO,PAITA,TUMBES"})
        assert r.status_code == 422
        assert "hasta 4" in r.json()["detail"]

    def test_rechaza_una_lista_vacia(self, client, datos_de_muestra):
        assert client.get("/api/readings/compare", params={"labs": " , "}).status_code == 422

    def test_una_zona_inexistente_responde_404(self, client, datos_de_muestra):
        r = client.get("/api/readings/compare", params={"labs": "CALLAO,HUANCHACO"})
        assert r.status_code == 404

    def test_tolera_espacios_alrededor_de_los_codigos(self, client, datos_de_muestra):
        r = client.get("/api/readings/compare", params={"labs": " CALLAO , PISCO "})
        assert r.status_code == 200
        assert len(r.json()["series"]) == 2


@pytest.mark.slow
class TestRendimientoConElDatasetReal:
    def test_el_historico_completo_no_desborda_el_navegador(self, client, db_session):
        """Con el dataset real, la SRS exige responder en menos de 3 segundos."""
        from pathlib import Path

        from ola.services import import_service

        dataset = Path("/dataset/IMARPE_Anomalia_TSM.csv")
        if not dataset.exists():
            pytest.skip("El dataset real no esta montado en /dataset")

        with dataset.open("rb") as archivo:
            import_service.run_import(
                db_session, filename="real.csv", stream=archivo, uploaded_by_id=None
            )

        datos = serie(client, "PISCO", **{"from": "1970-01-01", "to": "2026-07-31"})
        # PISCO tiene 16,678 mediciones; agrupadas por mes son menos de 700.
        assert len(puntos(datos)) < 1000
        assert datos["resolution"] == "monthly"
