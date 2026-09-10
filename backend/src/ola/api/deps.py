"""Dependencias compartidas por los routers."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ola.config import Settings, get_settings
from ola.db.models import User
from ola.db.session import get_session
from ola.mail import Mailer, SmtpMailer
from ola.repositories import users_repo
from ola.security import decode_access_token
from ola.services import settings_service
from ola.services.settings_service import EffectiveSettings

bearer_scheme = HTTPBearer(auto_error=False)

SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

CREDENCIALES_INVALIDAS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenciales invalidas o sesion expirada.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    session: SessionDep,
    settings: SettingsDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> User:
    if credentials is None:
        raise CREDENCIALES_INVALIDAS
    try:
        payload = decode_access_token(
            credentials.credentials,
            secret=settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise CREDENCIALES_INVALIDAS from exc

    user = users_repo.get_by_id(session, user_id)
    if user is None or not user.is_active:
        raise CREDENCIALES_INVALIDAS
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta accion requiere permisos de administrador.",
        )
    return user


AdminUser = Annotated[User, Depends(require_admin)]


def get_effective_settings(session: SessionDep, settings: SettingsDep) -> EffectiveSettings:
    """Parametros vigentes: los de .env, sobrescritos por los del administrador."""
    return settings_service.get_effective(session, settings)


EffectiveSettingsDep = Annotated[EffectiveSettings, Depends(get_effective_settings)]


def get_mailer(settings: SettingsDep) -> Mailer:
    return SmtpMailer(settings)


MailerDep = Annotated[Mailer, Depends(get_mailer)]
