"""Parametros ajustables por el administrador (RF-01)."""

from __future__ import annotations

import pytest


class TestConsulta:
    def test_devuelve_los_valores_por_defecto_acordados(self, client):
        config = client.get("/api/settings").json()
        assert config["threshold_c"] == "0.5"
        assert config["min_streak_records"] == 5
        assert config["max_gap_days"] == 2
        assert config["freshness_days"] == 7

    def test_la_consulta_es_publica(self, client):
        assert client.get("/api/settings").status_code == 200


class TestActualizacion:
    def test_el_administrador_puede_cambiar_el_umbral(self, client, admin_headers):
        r = client.put("/api/settings", headers=admin_headers, json={"threshold_c": 1.2})
        assert r.status_code == 200
        assert r.json()["threshold_c"] == "1.2"

    def test_el_cambio_persiste(self, client, admin_headers):
        client.put("/api/settings", headers=admin_headers, json={"freshness_days": 15})
        assert client.get("/api/settings").json()["freshness_days"] == 15

    def test_permite_cambiar_varios_parametros_a_la_vez(self, client, admin_headers):
        r = client.put(
            "/api/settings",
            headers=admin_headers,
            json={"min_streak_records": 7, "max_gap_days": 4},
        )
        assert r.json()["min_streak_records"] == 7
        assert r.json()["max_gap_days"] == 4

    def test_un_usuario_normal_no_puede_cambiarlos(self, client, user_headers):
        r = client.put("/api/settings", headers=user_headers, json={"threshold_c": 1.0})
        assert r.status_code == 403

    def test_un_anonimo_no_puede_cambiarlos(self, client):
        assert client.put("/api/settings", json={"threshold_c": 1.0}).status_code == 401


class TestValidacion:
    @pytest.mark.parametrize("valor", [0, -1, 99, "mucho"])
    def test_rechaza_umbrales_fuera_de_rango(self, client, admin_headers, valor):
        r = client.put("/api/settings", headers=admin_headers, json={"threshold_c": valor})
        assert r.status_code == 422

    @pytest.mark.parametrize(
        ("clave", "valor"),
        [
            ("min_streak_records", 1),
            ("min_streak_records", 100),
            ("max_gap_days", -1),
            ("freshness_days", 0),
            ("map_window_days", 0),
        ],
    )
    def test_rechaza_enteros_fuera_de_rango(self, client, admin_headers, clave, valor):
        r = client.put("/api/settings", headers=admin_headers, json={clave: valor})
        assert r.status_code == 422

    def test_rechaza_un_parametro_desconocido(self, client, admin_headers):
        r = client.put("/api/settings", headers=admin_headers, json={"inventado": 1})
        assert r.status_code == 422
        assert "desconocido" in r.json()["detail"]

    def test_un_valor_invalido_no_deja_cambios_a_medias(self, client, admin_headers):
        client.put(
            "/api/settings", headers=admin_headers, json={"freshness_days": 20, "inventado": 1}
        )
        # El parametro valido tampoco debe haberse guardado.
        assert client.get("/api/settings").json()["freshness_days"] == 7


class TestEfectoEnLaDeteccion:
    def test_cambiar_el_umbral_cambia_las_rachas_detectadas(
        self, client, admin_headers, datos_de_muestra
    ):
        con_defecto = client.get("/api/laboratories/CALLAO/streaks").json()
        assert len(con_defecto) == 1

        client.put("/api/settings", headers=admin_headers, json={"threshold_c": 2.0})
        con_umbral_alto = client.get("/api/laboratories/CALLAO/streaks").json()
        assert con_umbral_alto == []

    def test_cambiar_la_ventana_de_frescura_cambia_que_zonas_estan_vigentes(
        self, client, admin_headers, datos_de_muestra
    ):
        def paita() -> dict:
            estado = client.get("/api/status").json()
            return next(z for z in estado["zones"] if z["laboratory"]["code"] == "PAITA")

        # PAITA lleva 10 dias sin medir: obsoleta con la ventana de 7.
        assert paita()["is_stale"] is True

        client.put("/api/settings", headers=admin_headers, json={"freshness_days": 15})
        assert paita()["is_stale"] is False
