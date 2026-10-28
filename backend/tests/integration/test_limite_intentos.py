"""Limite de intentos en el inicio de sesion y en la recuperacion (RF-07).

Con los valores por defecto: 5 fallos por cuenta y 20 por IP para entrar, 10
solicitudes de codigo y 20 codigos equivocados por IP, en 15 minutos. Todas
las peticiones de TestClient llegan desde la misma IP ("testclient").
"""

from __future__ import annotations

CLAVE = "miclave123"


def entrar(client, email: str, password: str):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def pedir_codigo(client, email: str):
    return client.post("/api/auth/password-reset/request", json={"email": email})


def confirmar(client, email: str, codigo: str = "000000"):
    return client.post(
        "/api/auth/password-reset/confirm",
        json={"email": email, "code": codigo, "password": "clave-nueva-123"},
    )


class TestInicioDeSesion:
    def test_tras_cinco_fallos_la_cuenta_queda_bloqueada(self, client, normal_user):
        for _ in range(5):
            assert entrar(client, normal_user.email, "equivocada").status_code == 401

        # Ni con la contrasena correcta: el bloqueo dura la ventana.
        r = entrar(client, normal_user.email, CLAVE)
        assert r.status_code == 429
        assert 0 < int(r.headers["Retry-After"]) <= 15 * 60
        assert r.json()["detail"] == "Demasiados intentos. Vuelve a intentarlo en 15 minutos."

    def test_acertar_reinicia_el_contador_de_la_cuenta(self, client, normal_user):
        for _ in range(4):
            entrar(client, normal_user.email, "equivocada")
        assert entrar(client, normal_user.email, CLAVE).status_code == 200

        for _ in range(4):
            entrar(client, normal_user.email, "equivocada")
        assert entrar(client, normal_user.email, CLAVE).status_code == 200

    def test_las_mayusculas_del_correo_no_esquivan_el_limite(self, client, normal_user):
        for variante in ["PESCADOR@ejemplo.pe", "Pescador@Ejemplo.pe", " pescador@ejemplo.pe"]:
            entrar(client, variante.strip(), "equivocada")
        entrar(client, normal_user.email.upper(), "equivocada")
        entrar(client, normal_user.email, "equivocada")

        assert entrar(client, normal_user.email, CLAVE).status_code == 429

    def test_bloquear_una_cuenta_no_bloquea_las_demas(self, client, normal_user, admin_user):
        for _ in range(5):
            entrar(client, normal_user.email, "equivocada")
        assert entrar(client, admin_user.email, CLAVE).status_code == 200

    def test_muchos_fallos_desde_una_ip_la_bloquean(self, client, normal_user):
        for numero in range(20):
            assert entrar(client, f"nadie{numero}@ejemplo.pe", "x").status_code == 401

        assert entrar(client, normal_user.email, CLAVE).status_code == 429


class TestRecuperacion:
    def test_limita_las_solicitudes_de_codigo_por_ip(self, client):
        for numero in range(10):
            assert pedir_codigo(client, f"persona{numero}@ejemplo.pe").status_code == 202

        assert pedir_codigo(client, "otra@ejemplo.pe").status_code == 429

    def test_limita_los_codigos_equivocados_por_ip(self, client, normal_user):
        for numero in range(20):
            assert confirmar(client, f"persona{numero}@ejemplo.pe").status_code == 400

        assert confirmar(client, normal_user.email).status_code == 429
