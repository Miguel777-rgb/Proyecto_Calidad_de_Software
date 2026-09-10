"""Casos de uso de autenticacion (RF-07)."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ola.config import Settings
from ola.db.models import User, UserRole
from ola.repositories import users_repo
from ola.security import create_access_token, hash_password, verify_password


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InactiveUserError(Exception):
    pass


@dataclass(frozen=True)
class IssuedToken:
    access_token: str
    expires_in: int
    user: User


def register(
    session: Session,
    *,
    email: str,
    password: str,
    full_name: str | None = None,
) -> User:
    if users_repo.get_by_email(session, email) is not None:
        raise EmailAlreadyRegisteredError
    return users_repo.create(
        session,
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
    )


def authenticate(session: Session, *, email: str, password: str) -> User:
    user = users_repo.get_by_email(session, email)
    if user is None:
        # Se verifica igual contra un hash ficticio para que el tiempo de
        # respuesta no revele si el correo existe.
        verify_password(password, "$2b$12$" + "x" * 53)
        raise InvalidCredentialsError
    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError
    if not user.is_active:
        raise InactiveUserError
    return user


def issue_token(user: User, settings: Settings) -> IssuedToken:
    token = create_access_token(
        subject=str(user.id),
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        expires_minutes=settings.access_token_minutes,
        extra_claims={"email": user.email, "role": user.role.value},
    )
    return IssuedToken(
        access_token=token,
        expires_in=settings.access_token_minutes * 60,
        user=user,
    )


def ensure_admin_exists(session: Session, settings: Settings) -> User | None:
    """Crea el administrador inicial si aun no existe.

    Se ejecuta al arrancar la aplicacion. La base nace vacia y solo un
    administrador puede importar el dataset, asi que sin esto el sistema
    quedaria inutilizable tras un despliegue limpio.

    En produccion arrancan varios procesos a la vez y todos ejecutan esto:
    comprobar y despues insertar deja una ventana en la que dos pueden crear
    la misma cuenta. La restriccion de unicidad del correo es la que decide,
    y el proceso que pierde la carrera simplemente no crea nada.
    """
    existing = users_repo.get_by_email(session, settings.admin_email)
    if existing is not None:
        return None
    try:
        # La insercion ya ocurre en el flush del repositorio, asi que el
        # guardado tiene que cubrir tambien esa llamada.
        admin = users_repo.create(
            session,
            email=settings.admin_email,
            password_hash=hash_password(settings.admin_password),
            full_name="Administrador",
            role=UserRole.ADMIN,
        )
        session.commit()
    except IntegrityError:
        session.rollback()
        return None
    return admin
