"""Dependencias compartidas por los routers."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ola.config import Settings, get_settings
from ola.db.models import User
from ola.db.session import get_session
from ola.mail import Mailer, SmtpMailer
from ola.ratelimit import AuthLimiters
from ola.repositories import users_repo
from ola.security import decode_access_token
from ola.services import auth_service, settings_service
from ola.services.channels import ChannelRegistry, default_channels
from ola.services.settings_service import EffectiveSettings

bearer_scheme = HTTPBearer(auto_error=False)

SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

CREDENCIALES_INVALIDAS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenciales inválidas o sesión expirada.",
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
    # Cambiar la contrasena cierra las sesiones abiertas antes del cambio.
    if auth_service.token_revoked(payload, user):
        raise CREDENCIALES_INVALIDAS
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción requiere permisos de administrador.",
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


def get_auth_limiters(request: Request) -> AuthLimiters:
    limiters: AuthLimiters = request.app.state.auth_limiters
    return limiters


AuthLimitersDep = Annotated[AuthLimiters, Depends(get_auth_limiters)]


def client_ip(request: Request) -> str:
    """Direccion del cliente para los limites de intentos.

    Detras de Traefik, uvicorn la toma de X-Forwarded-For porque confia en el
    proxy (FORWARDED_ALLOW_IPS en compose.prod.yml); si no, todos los clientes
    compartirian la IP del proxy y uno solo bloquearia a los demas.
    """
    return request.client.host if request.client is not None else "desconocida"


ClientIpDep = Annotated[str, Depends(client_ip)]


def get_channels(mailer: MailerDep) -> ChannelRegistry:
    """Canales de aviso del sistema. Aqui se conecta cada canal con lo que necesita."""
    return default_channels(mailer)


ChannelsDep = Annotated[ChannelRegistry, Depends(get_channels)]
