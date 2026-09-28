"""Casos de uso de autenticacion (RF-07)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ola.config import Settings
from ola.db.models import User, UserRole
from ola.domain import messages
from ola.mail import Email, Mailer
from ola.repositories import password_reset_repo, users_repo
from ola.security import (
    create_access_token,
    generate_reset_code,
    hash_password,
    hash_reset_code,
    reset_code_matches,
    verify_password,
)

logger = logging.getLogger(__name__)


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InactiveUserError(Exception):
    pass


class InvalidResetCodeError(Exception):
    """El codigo no existe, ya se uso, vencio o no coincide."""


class TooManyResetAttemptsError(Exception):
    """Se agotaron los intentos del codigo: hay que pedir otro."""


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


def issue_token(user: User, settings: Settings, *, larga: bool = False) -> IssuedToken:
    """Token de sesion. La app pide una sesion larga; la web, la normal."""
    minutos = settings.app_session_days * 24 * 60 if larga else settings.access_token_minutes
    token = create_access_token(
        subject=str(user.id),
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        expires_minutes=minutos,
        extra_claims={"email": user.email, "role": user.role.value},
    )
    return IssuedToken(access_token=token, expires_in=minutos * 60, user=user)


def token_revoked(payload: dict[str, Any], user: User) -> bool:
    """Un token emitido antes del ultimo cambio de contrasena ya no vale.

    iat viene en segundos enteros: se compara con el segundo del cambio para
    que el token emitido en ese mismo momento siga valiendo.
    """
    if user.password_changed_at is None:
        return False
    emitido = payload.get("iat")
    if not isinstance(emitido, int | float):
        return True
    return int(emitido) < int(user.password_changed_at.timestamp())


def request_password_reset(
    session: Session,
    *,
    email: str,
    mailer: Mailer,
    settings: Settings,
    now: datetime | None = None,
) -> None:
    """Envia un codigo por correo si el correo tiene una cuenta activa.

    Quien llama responde lo mismo en todos los casos, para que nadie pueda
    averiguar que correos estan registrados. Por la misma razon, pedir otro
    codigo antes de un minuto no da error: simplemente no se envia.
    """
    ahora = now or datetime.now(UTC)
    user = users_repo.get_by_email(session, email)
    if user is None or not user.is_active:
        return

    anterior = password_reset_repo.latest(session, user.id)
    espera = timedelta(seconds=settings.password_reset_interval_seconds)
    if anterior is not None and ahora - anterior.created_at < espera:
        return

    codigo = generate_reset_code()
    password_reset_repo.create(
        session,
        user_id=user.id,
        code_hash=hash_reset_code(codigo, user_id=user.id, secret=settings.jwt_secret),
        created_at=ahora,
        expires_at=ahora + timedelta(minutes=settings.password_reset_minutes),
    )
    mensaje = messages.password_reset_code(code=codigo, minutes=settings.password_reset_minutes)
    try:
        mailer.send(Email(to=user.email, subject=mensaje.subject, body=mensaje.body))
    except Exception:
        # Se registra y se sigue: responder distinto revelaria que la cuenta
        # existe. El codigo no enviado no sirve, asi que se descarta.
        logger.exception("No se pudo enviar el codigo de recuperacion a %s", user.id)
        session.rollback()
        return
    session.commit()


def confirm_password_reset(
    session: Session,
    *,
    email: str,
    code: str,
    new_password: str,
    settings: Settings,
    now: datetime | None = None,
) -> User:
    """Cambia la contrasena si el codigo es el vigente.

    Un codigo equivocado suma un intento; al agotarlos se anula. Los intentos
    quedan en la sesion: quien llama debe confirmar la transaccion tambien
    cuando esta funcion lanza el error.
    """
    ahora = now or datetime.now(UTC)
    user = users_repo.get_by_email(session, email)
    if user is None or not user.is_active:
        raise InvalidResetCodeError
    codigo = password_reset_repo.active(session, user.id, ahora)
    if codigo is None:
        raise InvalidResetCodeError
    if codigo.attempts >= settings.password_reset_attempts:
        raise TooManyResetAttemptsError

    if not reset_code_matches(code, codigo.code_hash, user_id=user.id, secret=settings.jwt_secret):
        codigo.attempts += 1
        if codigo.attempts >= settings.password_reset_attempts:
            codigo.used_at = ahora
            raise TooManyResetAttemptsError
        raise InvalidResetCodeError

    user.password_hash = hash_password(new_password)
    user.password_changed_at = ahora
    codigo.used_at = ahora
    return user


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
