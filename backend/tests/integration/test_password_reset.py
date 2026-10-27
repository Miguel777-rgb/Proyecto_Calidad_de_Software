"""Recuperar la contrasena con un codigo por correo y sesiones largas (RF-07)."""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from ola.api.deps import get_mailer
from ola.config import get_settings
from ola.db.models import PasswordResetCode, User, UserRole
from ola.mail import RecordingMailer
from ola.security import create_access_token, hash_password

CLAVE = "miclave123"
NUEVA = "otra clave larga"
CORREO = "pescador@ejemplo.pe"
ENVIADO = "Si ese correo tiene cuenta, te enviamos un código."
INVALIDO = "El código no es válido o ya venció."
AGOTADO = "Superaste los intentos. Pide un código nuevo."
TREINTA_DIAS = 30 * 24 * 60 * 60


@pytest.fixture
def usuario(db_session) -> User:
    user = User(
        email=CORREO,
        password_hash=hash_password(CLAVE),
        full_name="Juan Pescador",
        role=UserRole.USER,
    )
    db_session.add(user)
    db_session.commit()
    return user


def pedir(client, correo: str = CORREO):
    return client.post("/api/auth/password-reset/request", json={"email": correo})


def codigo_del_correo(mailer: RecordingMailer) -> str:
    coincidencia = re.search(r"\b(\d{6})\b", mailer.sent[-1].body)
    assert coincidencia is not None, "el correo no trae un codigo de 6 digitos"
    return coincidencia.group(1)


def confirmar(client, codigo: str, **extra):
    return client.post(
        "/api/auth/password-reset/confirm",
        json={"email": CORREO, "code": codigo, "password": NUEVA, **extra},
    )


def otro_codigo(codigo: str) -> str:
    return f"{(int(codigo) + 1) % 1_000_000:06d}"


class TestPedirCodigo:
    def test_envia_un_codigo_de_6_digitos_al_correo(self, client, mailer, usuario):
        respuesta = pedir(client)

        assert respuesta.status_code == 202
        assert respuesta.json() == {"detail": ENVIADO}
        assert len(mailer.sent) == 1
        assert mailer.sent[0].to == CORREO
        assert mailer.sent[0].subject == "Tu código para cambiar la contraseña de OLA"
        assert re.fullmatch(r"\d{6}", codigo_del_correo(mailer))

    def test_no_guarda_el_codigo_sino_su_hash(self, client, mailer, db_session, usuario):
        pedir(client)

        guardado = db_session.scalar(select(PasswordResetCode))
        assert guardado is not None
        assert codigo_del_correo(mailer) not in guardado.code_hash
        assert len(guardado.code_hash) == 64

    def test_un_correo_sin_cuenta_recibe_la_misma_respuesta_y_ningun_correo(self, client, mailer):
        respuesta = pedir(client, "nadie@ejemplo.pe")

        assert respuesta.status_code == 202
        assert respuesta.json() == {"detail": ENVIADO}
        assert mailer.sent == []

    def test_una_cuenta_desactivada_no_recibe_codigo(self, client, mailer, db_session, usuario):
        usuario.is_active = False
        db_session.commit()

        assert pedir(client).status_code == 202
        assert mailer.sent == []

    def test_pedir_otro_antes_de_un_minuto_no_envia_nada(self, client, mailer, usuario):
        pedir(client)
        segunda = pedir(client)

        assert segunda.status_code == 202
        assert segunda.json() == {"detail": ENVIADO}
        assert len(mailer.sent) == 1

    def test_pasado_el_minuto_llega_otro_y_el_anterior_deja_de_valer(
        self, client, mailer, db_session, usuario
    ):
        pedir(client)
        primero = codigo_del_correo(mailer)
        anterior = db_session.scalar(select(PasswordResetCode))
        anterior.created_at = datetime.now(UTC) - timedelta(minutes=2)
        db_session.commit()

        pedir(client)
        segundo = codigo_del_correo(mailer)

        assert len(mailer.sent) == 2
        if primero != segundo:
            assert confirmar(client, primero).json() == {"detail": INVALIDO}
        assert confirmar(client, segundo).status_code == 200

    def test_si_el_correo_falla_responde_igual_y_no_guarda_el_codigo(
        self, client, db_session, usuario
    ):
        client.app.dependency_overrides[get_mailer] = lambda: RecordingMailer(
            fail_with=ConnectionRefusedError("smtp caido")
        )

        respuesta = pedir(client)

        assert respuesta.status_code == 202
        assert respuesta.json() == {"detail": ENVIADO}
        assert db_session.scalar(select(PasswordResetCode)) is None

    def test_rechaza_un_correo_mal_escrito(self, client):
        assert pedir(client, "no-es-un-correo").status_code == 422


class TestCambiarContrasena:
    def test_con_el_codigo_cambia_la_contrasena_y_abre_una_sesion(self, client, mailer, usuario):
        pedir(client)

        respuesta = confirmar(client, codigo_del_correo(mailer))

        assert respuesta.status_code == 200
        cuerpo = respuesta.json()
        assert cuerpo["user"]["email"] == CORREO
        assert cuerpo["expires_in"] == 60 * 60
        yo = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {cuerpo['access_token']}"}
        )
        assert yo.status_code == 200

    def test_despues_solo_vale_la_contrasena_nueva(self, client, mailer, usuario):
        pedir(client)
        confirmar(client, codigo_del_correo(mailer))

        vieja = client.post("/api/auth/login", json={"email": CORREO, "password": CLAVE})
        nueva = client.post("/api/auth/login", json={"email": CORREO, "password": NUEVA})

        assert vieja.status_code == 401
        assert nueva.status_code == 200

    def test_cierra_las_sesiones_abiertas_antes_del_cambio(self, client, mailer, usuario):
        ajustes = get_settings()
        token_viejo = create_access_token(
            str(usuario.id),
            secret=ajustes.jwt_secret,
            algorithm=ajustes.jwt_algorithm,
            expires_minutes=ajustes.app_session_days * 24 * 60,
            now=datetime.now(UTC) - timedelta(minutes=5),
        )
        pedir(client)

        token_nuevo = confirmar(client, codigo_del_correo(mailer)).json()["access_token"]

        viejo = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_viejo}"})
        nuevo = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_nuevo}"})
        assert viejo.status_code == 401
        assert viejo.json()["detail"] == "Credenciales inválidas o sesión expirada."
        assert nuevo.status_code == 200

    def test_el_codigo_sirve_una_sola_vez(self, client, mailer, usuario):
        pedir(client)
        codigo = codigo_del_correo(mailer)
        confirmar(client, codigo)

        otra_vez = confirmar(client, codigo)

        assert otra_vez.status_code == 400
        assert otra_vez.json() == {"detail": INVALIDO}

    def test_un_codigo_equivocado_no_cambia_nada(self, client, mailer, usuario):
        pedir(client)

        respuesta = confirmar(client, otro_codigo(codigo_del_correo(mailer)))

        assert respuesta.status_code == 400
        assert respuesta.json() == {"detail": INVALIDO}
        assert (
            client.post("/api/auth/login", json={"email": CORREO, "password": CLAVE}).status_code
            == 200
        )

    def test_al_quinto_intento_fallido_el_codigo_se_anula(self, client, mailer, usuario):
        pedir(client)
        codigo = codigo_del_correo(mailer)
        equivocado = otro_codigo(codigo)

        respuestas = [confirmar(client, equivocado).json()["detail"] for _ in range(5)]

        assert respuestas == [INVALIDO, INVALIDO, INVALIDO, INVALIDO, AGOTADO]
        despues = confirmar(client, codigo)
        assert despues.status_code == 400
        assert despues.json() == {"detail": INVALIDO}

    def test_un_codigo_vencido_no_sirve(self, client, mailer, db_session, usuario):
        pedir(client)
        guardado = db_session.scalar(select(PasswordResetCode))
        guardado.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        db_session.commit()

        respuesta = confirmar(client, codigo_del_correo(mailer))

        assert respuesta.status_code == 400
        assert respuesta.json() == {"detail": INVALIDO}

    def test_el_codigo_vale_15_minutos(self, client, mailer, db_session, usuario):
        pedir(client)
        guardado = db_session.scalar(select(PasswordResetCode))

        assert guardado.expires_at - guardado.created_at == timedelta(minutes=15)

    def test_sin_codigo_pedido_responde_como_codigo_invalido(self, client, usuario):
        respuesta = confirmar(client, "123456")

        assert respuesta.status_code == 400
        assert respuesta.json() == {"detail": INVALIDO}

    def test_un_correo_sin_cuenta_responde_igual(self, client):
        respuesta = client.post(
            "/api/auth/password-reset/confirm",
            json={"email": "nadie@ejemplo.pe", "code": "123456", "password": NUEVA},
        )

        assert respuesta.status_code == 400
        assert respuesta.json() == {"detail": INVALIDO}

    @pytest.mark.parametrize("codigo", ["12345", "1234567", "12a456", ""])
    def test_el_codigo_son_6_digitos(self, client, codigo):
        respuesta = client.post(
            "/api/auth/password-reset/confirm",
            json={"email": CORREO, "code": codigo, "password": NUEVA},
        )

        assert respuesta.status_code == 422

    def test_la_contrasena_nueva_sigue_la_regla_de_8_caracteres(self, client, mailer, usuario):
        pedir(client)

        respuesta = client.post(
            "/api/auth/password-reset/confirm",
            json={"email": CORREO, "code": codigo_del_correo(mailer), "password": "corta"},
        )

        assert respuesta.status_code == 422

    def test_la_app_pide_una_sesion_de_30_dias(self, client, mailer, usuario):
        pedir(client)

        respuesta = confirmar(client, codigo_del_correo(mailer), mantener_sesion=True)

        assert respuesta.json()["expires_in"] == TREINTA_DIAS


class TestSesionLarga:
    def test_entrar_desde_la_app_da_30_dias(self, client, usuario):
        respuesta = client.post(
            "/api/auth/login", json={"email": CORREO, "password": CLAVE, "mantener_sesion": True}
        )

        assert respuesta.json()["expires_in"] == TREINTA_DIAS

    def test_la_web_sigue_con_una_hora(self, client, usuario):
        respuesta = client.post("/api/auth/login", json={"email": CORREO, "password": CLAVE})

        assert respuesta.json()["expires_in"] == 60 * 60

    def test_registrarse_desde_la_app_da_30_dias(self, client):
        respuesta = client.post(
            "/api/auth/register",
            json={"email": "nueva@ejemplo.pe", "password": CLAVE, "mantener_sesion": True},
        )

        assert respuesta.status_code == 201
        assert respuesta.json()["expires_in"] == TREINTA_DIAS


class TestMensajesConTildes:
    def test_contrasena_incorrecta(self, client, usuario):
        respuesta = client.post("/api/auth/login", json={"email": CORREO, "password": "otra123456"})

        assert respuesta.json()["detail"] == "Correo o contraseña incorrectos."

    def test_cuenta_desactivada(self, client, db_session, usuario):
        usuario.is_active = False
        db_session.commit()

        respuesta = client.post("/api/auth/login", json={"email": CORREO, "password": CLAVE})

        assert respuesta.json()["detail"] == "La cuenta está desactivada."

    def test_sin_sesion(self, client):
        respuesta = client.get("/api/auth/me")

        assert respuesta.json()["detail"] == "Credenciales inválidas o sesión expirada."

    def test_solo_administrador(self, client, user_headers):
        respuesta = client.get("/api/imports", headers=user_headers)

        assert respuesta.json()["detail"] == "Esta acción requiere permisos de administrador."
