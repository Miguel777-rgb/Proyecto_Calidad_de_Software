"""Registro, inicio de sesion y sesion vigente (RF-07)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from ola.config import get_settings
from ola.db.models import User, UserRole
from ola.security import create_access_token, hash_password

CLAVE = "miclave123"


@pytest.fixture
def usuario(db_session) -> User:
    user = User(
        email="pescador@ejemplo.pe",
        password_hash=hash_password(CLAVE),
        full_name="Juan Pescador",
        role=UserRole.USER,
    )
    db_session.add(user)
    db_session.commit()
    return user


def _token_de(user_id: int, **kwargs) -> str:
    s = get_settings()
    return create_access_token(
        str(user_id),
        secret=s.jwt_secret,
        algorithm=s.jwt_algorithm,
        expires_minutes=s.access_token_minutes,
        **kwargs,
    )


class TestRegistro:
    def test_registra_y_devuelve_una_sesion_iniciada(self, client):
        r = client.post(
            "/api/auth/register",
            json={"email": "nuevo@ejemplo.pe", "password": CLAVE, "full_name": "Nuevo"},
        )
        assert r.status_code == 201
        cuerpo = r.json()
        assert cuerpo["token_type"] == "bearer"
        assert cuerpo["access_token"]
        assert cuerpo["user"]["email"] == "nuevo@ejemplo.pe"
        assert cuerpo["user"]["role"] == "user", "un registro publico nunca crea administradores"

    def test_guarda_el_correo_en_minusculas(self, client):
        r = client.post(
            "/api/auth/register",
            json={"email": "Pescador@Ejemplo.PE", "password": CLAVE},
        )
        assert r.json()["user"]["email"] == "pescador@ejemplo.pe"

    def test_rechaza_un_correo_ya_registrado_aunque_cambie_las_mayusculas(self, client, usuario):
        r = client.post(
            "/api/auth/register",
            json={"email": "PESCADOR@EJEMPLO.PE", "password": "otraclave1"},
        )
        assert r.status_code == 409

    @pytest.mark.parametrize("clave", ["", "corta", "1234567"])
    def test_rechaza_contrasenas_de_menos_de_8_caracteres(self, client, clave):
        r = client.post("/api/auth/register", json={"email": "x@ejemplo.pe", "password": clave})
        assert r.status_code == 422

    def test_acepta_exactamente_8_caracteres(self, client):
        r = client.post(
            "/api/auth/register", json={"email": "x@ejemplo.pe", "password": "12345678"}
        )
        assert r.status_code == 201

    def test_rechaza_una_contrasena_que_bcrypt_truncaria(self, client):
        r = client.post(
            "/api/auth/register",
            json={"email": "x@ejemplo.pe", "password": "a" * 73},
        )
        assert r.status_code == 422

    def test_rechaza_un_correo_mal_formado(self, client):
        r = client.post("/api/auth/register", json={"email": "no-es-correo", "password": CLAVE})
        assert r.status_code == 422

    def test_nunca_devuelve_el_hash_de_la_contrasena(self, client):
        r = client.post("/api/auth/register", json={"email": "x@ejemplo.pe", "password": CLAVE})
        assert "password" not in r.text
        assert "hash" not in r.text


class TestInicioDeSesion:
    def test_inicia_sesion_con_credenciales_correctas(self, client, usuario):
        r = client.post("/api/auth/login", json={"email": usuario.email, "password": CLAVE})
        assert r.status_code == 200
        assert r.json()["user"]["id"] == usuario.id

    def test_el_correo_no_distingue_mayusculas(self, client, usuario):
        r = client.post("/api/auth/login", json={"email": "PESCADOR@ejemplo.pe", "password": CLAVE})
        assert r.status_code == 200

    def test_rechaza_una_contrasena_incorrecta(self, client, usuario):
        r = client.post("/api/auth/login", json={"email": usuario.email, "password": "incorrecta"})
        assert r.status_code == 401

    def test_rechaza_un_correo_no_registrado(self, client):
        r = client.post("/api/auth/login", json={"email": "nadie@ejemplo.pe", "password": CLAVE})
        assert r.status_code == 401

    def test_el_mensaje_no_revela_si_el_correo_existe(self, client, usuario):
        existe = client.post(
            "/api/auth/login", json={"email": usuario.email, "password": "incorrecta"}
        )
        no_existe = client.post(
            "/api/auth/login", json={"email": "nadie@ejemplo.pe", "password": "incorrecta"}
        )
        assert existe.json()["detail"] == no_existe.json()["detail"]

    def test_rechaza_una_cuenta_desactivada(self, client, db_session, usuario):
        usuario.is_active = False
        db_session.commit()
        r = client.post("/api/auth/login", json={"email": usuario.email, "password": CLAVE})
        assert r.status_code == 403


class TestSesionVigente:
    def test_devuelve_el_usuario_del_token(self, client, usuario):
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {_token_de(usuario.id)}"})
        assert r.status_code == 200
        assert r.json()["email"] == usuario.email

    def test_sin_cabecera_de_autorizacion_responde_401(self, client):
        assert client.get("/api/auth/me").status_code == 401

    def test_con_un_token_ilegible_responde_401(self, client):
        r = client.get("/api/auth/me", headers={"Authorization": "Bearer no.es.un.token"})
        assert r.status_code == 401

    def test_con_un_token_vencido_responde_401(self, client, usuario):
        vencido = _token_de(usuario.id, now=datetime.now(UTC) - timedelta(hours=2))
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {vencido}"})
        assert r.status_code == 401

    def test_con_un_token_de_un_usuario_borrado_responde_401(self, client, db_session, usuario):
        identificador = usuario.id
        db_session.delete(usuario)
        db_session.commit()
        r = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {_token_de(identificador)}"}
        )
        assert r.status_code == 401

    def test_una_cuenta_desactivada_pierde_la_sesion_en_curso(self, client, db_session, usuario):
        token = _token_de(usuario.id)
        usuario.is_active = False
        db_session.commit()
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 401
