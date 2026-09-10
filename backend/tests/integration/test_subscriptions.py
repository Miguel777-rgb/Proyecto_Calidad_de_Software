"""Suscripciones a zonas de interes (RF-07)."""

from __future__ import annotations


def codigos(respuesta) -> list[str]:
    return [s["laboratory"]["code"] for s in respuesta.json()]


class TestSuscribirse:
    def test_un_usuario_se_suscribe_a_una_zona(self, client, user_headers):
        r = client.post(
            "/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"}
        )
        assert r.status_code == 201
        assert r.json()["laboratory"]["code"] == "CALLAO"

    def test_puede_suscribirse_a_varias_zonas(self, client, user_headers):
        # RF-07 habla de "una o mas zonas de interes".
        for zona in ("CALLAO", "PISCO", "ILO"):
            client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": zona})
        assert codigos(client.get("/api/subscriptions", headers=user_headers)) == [
            "CALLAO",
            "PISCO",
            "ILO",
        ]

    def test_suscribirse_dos_veces_no_duplica(self, client, user_headers):
        for _ in range(2):
            r = client.post(
                "/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"}
            )
            assert r.status_code == 201
        assert len(codigos(client.get("/api/subscriptions", headers=user_headers))) == 1

    def test_el_codigo_no_distingue_mayusculas(self, client, user_headers):
        r = client.post(
            "/api/subscriptions", headers=user_headers, json={"laboratory_code": "callao"}
        )
        assert r.json()["laboratory"]["code"] == "CALLAO"

    def test_una_zona_inexistente_responde_404(self, client, user_headers):
        r = client.post(
            "/api/subscriptions", headers=user_headers, json={"laboratory_code": "HUANCHACO"}
        )
        assert r.status_code == 404

    def test_se_puede_seguir_una_zona_descontinuada(self, client, user_headers):
        # MATARANI aparece en el catalogo; suscribirse es legitimo aunque hoy
        # no genere alertas.
        r = client.post(
            "/api/subscriptions", headers=user_headers, json={"laboratory_code": "MATARANI"}
        )
        assert r.status_code == 201


class TestDarseDeBaja:
    def test_elimina_la_suscripcion(self, client, user_headers):
        client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"})
        assert client.delete("/api/subscriptions/CALLAO", headers=user_headers).status_code == 204
        assert codigos(client.get("/api/subscriptions", headers=user_headers)) == []

    def test_darse_de_baja_de_una_zona_no_suscrita_responde_404(self, client, user_headers):
        assert client.delete("/api/subscriptions/CALLAO", headers=user_headers).status_code == 404

    def test_no_afecta_a_las_demas_suscripciones(self, client, user_headers):
        for zona in ("CALLAO", "PISCO"):
            client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": zona})
        client.delete("/api/subscriptions/CALLAO", headers=user_headers)
        assert codigos(client.get("/api/subscriptions", headers=user_headers)) == ["PISCO"]


class TestAislamientoEntreUsuarios:
    def test_cada_usuario_ve_solo_sus_zonas(self, client, user_headers, admin_headers):
        client.post("/api/subscriptions", headers=user_headers, json={"laboratory_code": "CALLAO"})
        client.post("/api/subscriptions", headers=admin_headers, json={"laboratory_code": "PISCO"})

        assert codigos(client.get("/api/subscriptions", headers=user_headers)) == ["CALLAO"]
        assert codigos(client.get("/api/subscriptions", headers=admin_headers)) == ["PISCO"]

    def test_un_usuario_no_puede_dar_de_baja_la_zona_de_otro(
        self, client, user_headers, admin_headers
    ):
        client.post("/api/subscriptions", headers=admin_headers, json={"laboratory_code": "PISCO"})
        assert client.delete("/api/subscriptions/PISCO", headers=user_headers).status_code == 404
        assert codigos(client.get("/api/subscriptions", headers=admin_headers)) == ["PISCO"]


class TestPermisos:
    def test_hace_falta_iniciar_sesion_para_ver_las_suscripciones(self, client):
        assert client.get("/api/subscriptions").status_code == 401

    def test_hace_falta_iniciar_sesion_para_suscribirse(self, client):
        assert (
            client.post("/api/subscriptions", json={"laboratory_code": "CALLAO"}).status_code == 401
        )
