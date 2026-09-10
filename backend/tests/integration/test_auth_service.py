"""Arranque del administrador inicial y control de acceso por rol (RF-07)."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from ola.api.deps import AdminUser, CurrentUser, get_session
from ola.config import get_settings
from ola.db.models import User, UserRole
from ola.repositories import users_repo
from ola.security import create_access_token, hash_password, verify_password
from ola.services import auth_service


class TestAdministradorInicial:
    """La base nace vacia y solo un administrador puede importar el dataset,
    asi que sin esta cuenta un despliegue limpio quedaria inutilizable.
    """

    def test_crea_el_administrador_si_no_existe(self, db_session, settings_factory):
        s = settings_factory(admin_email="jefe@ola.pe", admin_password="clave-seguraaa")
        creado = auth_service.ensure_admin_exists(db_session, s)
        assert creado is not None
        assert creado.role is UserRole.ADMIN
        assert creado.email == "jefe@ola.pe"

    def test_guarda_la_clave_del_administrador_con_hash(self, db_session, settings_factory):
        s = settings_factory(admin_email="jefe@ola.pe", admin_password="clave-seguraaa")
        creado = auth_service.ensure_admin_exists(db_session, s)
        assert creado is not None
        assert creado.password_hash != "clave-seguraaa"
        assert verify_password("clave-seguraaa", creado.password_hash)

    def test_no_lo_duplica_al_volver_a_arrancar(self, db_session, settings_factory):
        s = settings_factory(admin_email="jefe@ola.pe", admin_password="clave-seguraaa")
        auth_service.ensure_admin_exists(db_session, s)
        assert auth_service.ensure_admin_exists(db_session, s) is None

    def test_no_pisa_la_clave_de_un_administrador_existente(self, db_session, settings_factory):
        """Si alguien cambio la clave, un reinicio no debe revertirla."""
        primera = settings_factory(admin_email="jefe@ola.pe", admin_password="clave-original")
        auth_service.ensure_admin_exists(db_session, primera)

        segunda = settings_factory(admin_email="jefe@ola.pe", admin_password="clave-distinta")
        auth_service.ensure_admin_exists(db_session, segunda)

        admin = users_repo.get_by_email(db_session, "jefe@ola.pe")
        assert admin is not None
        assert verify_password("clave-original", admin.password_hash)

    def test_dos_arranques_simultaneos_no_chocan(
        self, db_session, settings_factory, monkeypatch
    ):
        """En produccion arrancan varios procesos y todos ejecutan esto.

        Comprobar y despues insertar deja una ventana en la que dos procesos
        pueden intentar crear la misma cuenta. Se simula esa ventana dejando
        la comprobacion previa obsoleta: el segundo intento debe rendirse en
        silencio, no reventar el arranque.
        """
        s = settings_factory(admin_email="jefe@ola.pe", admin_password="clave-seguraaa")
        assert auth_service.ensure_admin_exists(db_session, s) is not None

        monkeypatch.setattr(users_repo, "get_by_email", lambda *_a, **_k: None)
        assert auth_service.ensure_admin_exists(db_session, s) is None

    def test_tras_la_carrera_solo_queda_una_cuenta(
        self, db_session, settings_factory, monkeypatch
    ):
        s = settings_factory(admin_email="jefe@ola.pe", admin_password="clave-seguraaa")
        auth_service.ensure_admin_exists(db_session, s)
        monkeypatch.setattr(users_repo, "get_by_email", lambda *_a, **_k: None)
        auth_service.ensure_admin_exists(db_session, s)

        from sqlalchemy import func, select

        total = db_session.scalar(
            select(func.count()).select_from(User).where(User.email == "jefe@ola.pe")
        )
        assert total == 1

    def test_el_administrador_puede_iniciar_sesion(self, client, db_session, settings_factory):
        s = settings_factory(admin_email="jefe@ola.pe", admin_password="clave-seguraaa")
        auth_service.ensure_admin_exists(db_session, s)
        r = client.post(
            "/api/auth/login", json={"email": "jefe@ola.pe", "password": "clave-seguraaa"}
        )
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"


@pytest.fixture
def app_con_rutas_protegidas(db_session):
    """App minima para ejercitar las dependencias de autorizacion.

    Las rutas reales de administrador llegan en la Fase 2 (RF-08); esto
    permite probar el guardian desde ya.
    """
    app = FastAPI()

    @app.get("/solo-usuarios")
    def solo_usuarios(user: CurrentUser) -> dict[str, str]:
        return {"email": user.email}

    @app.get("/solo-admin")
    def solo_admin(user: AdminUser) -> dict[str, str]:
        return {"email": user.email}

    app.dependency_overrides[get_session] = lambda: db_session
    return TestClient(app)


def _crear(db_session, email: str, role: UserRole) -> User:
    user = User(email=email, password_hash=hash_password("miclave123"), role=role)
    db_session.add(user)
    db_session.commit()
    return user


def _cabecera(user: User) -> dict[str, str]:
    s = get_settings()
    token = create_access_token(
        str(user.id),
        secret=s.jwt_secret,
        algorithm=s.jwt_algorithm,
        expires_minutes=s.access_token_minutes,
    )
    return {"Authorization": f"Bearer {token}"}


class TestControlDeAcceso:
    def test_un_usuario_normal_entra_a_las_rutas_de_usuario(
        self, app_con_rutas_protegidas, db_session
    ):
        user = _crear(db_session, "user@ola.pe", UserRole.USER)
        r = app_con_rutas_protegidas.get("/solo-usuarios", headers=_cabecera(user))
        assert r.status_code == 200

    def test_un_usuario_normal_no_entra_a_las_rutas_de_administrador(
        self, app_con_rutas_protegidas, db_session
    ):
        user = _crear(db_session, "user@ola.pe", UserRole.USER)
        r = app_con_rutas_protegidas.get("/solo-admin", headers=_cabecera(user))
        assert r.status_code == 403

    def test_el_administrador_entra_a_las_rutas_de_administrador(
        self, app_con_rutas_protegidas, db_session
    ):
        admin = _crear(db_session, "admin@ola.pe", UserRole.ADMIN)
        r = app_con_rutas_protegidas.get("/solo-admin", headers=_cabecera(admin))
        assert r.status_code == 200

    def test_sin_sesion_responde_401_y_no_403(self, app_con_rutas_protegidas):
        # 401 significa "no se quien eres"; 403 seria "se quien eres pero no puedes".
        assert app_con_rutas_protegidas.get("/solo-admin").status_code == 401
