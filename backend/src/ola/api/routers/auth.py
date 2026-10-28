"""Registro, inicio de sesion y perfil (RF-07)."""

from __future__ import annotations

import math

from fastapi import APIRouter, HTTPException, status

from ola.api.deps import (
    AuthLimitersDep,
    ClientIpDep,
    CurrentUser,
    MailerDep,
    SessionDep,
    SettingsDep,
)
from ola.api.schemas.auth import (
    MensajeOut,
    PasswordResetConfirm,
    PasswordResetRequest,
    TokenOut,
    UserLogin,
    UserOut,
    UserRegister,
)
from ola.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["autenticacion"])


def _frenar(*esperas: int | None) -> None:
    """Responde 429 si alguna clave (cuenta o IP) agoto sus intentos."""
    segundos = max((espera for espera in esperas if espera is not None), default=None)
    if segundos is None:
        return
    minutos = math.ceil(segundos / 60)
    unidad = "minuto" if minutos == 1 else "minutos"
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Demasiados intentos. Vuelve a intentarlo en {minutos} {unidad}.",
        headers={"Retry-After": str(segundos)},
    )


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registra un usuario y devuelve su sesion",
)
def register(datos: UserRegister, session: SessionDep, settings: SettingsDep) -> TokenOut:
    try:
        user = auth_service.register(
            session,
            email=datos.email,
            password=datos.password,
            full_name=datos.full_name,
        )
    except auth_service.EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con ese correo.",
        ) from None
    session.commit()
    emitido = auth_service.issue_token(user, settings, larga=datos.mantener_sesion)
    return TokenOut(
        access_token=emitido.access_token,
        expires_in=emitido.expires_in,
        user=UserOut.model_validate(emitido.user),
    )


@router.post("/login", response_model=TokenOut, summary="Inicia sesion")
def login(
    datos: UserLogin,
    session: SessionDep,
    settings: SettingsDep,
    limites: AuthLimitersDep,
    ip: ClientIpDep,
) -> TokenOut:
    # Se cuentan los fallos por cuenta (fuerza bruta contra una persona) y por
    # IP (un atacante que prueba muchos correos). Acertar solo limpia la cuenta:
    # si limpiara la IP, bastaria entrar a una cuenta propia entre intentos.
    cuenta = datos.email.strip().lower()
    _frenar(limites.login_per_account.retry_after(cuenta), limites.login_per_ip.retry_after(ip))
    try:
        user = auth_service.authenticate(session, email=datos.email, password=datos.password)
    except auth_service.InvalidCredentialsError:
        limites.login_per_account.record(cuenta)
        limites.login_per_ip.record(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        ) from None
    except auth_service.InactiveUserError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está desactivada.",
        ) from None
    limites.login_per_account.reset(cuenta)
    emitido = auth_service.issue_token(user, settings, larga=datos.mantener_sesion)
    return TokenOut(
        access_token=emitido.access_token,
        expires_in=emitido.expires_in,
        user=UserOut.model_validate(emitido.user),
    )


@router.get("/me", response_model=UserOut, summary="Devuelve el usuario de la sesion")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


CODIGO_ENVIADO = "Si ese correo tiene cuenta, te enviamos un código."
CODIGO_INVALIDO = "El código no es válido o ya venció."
DEMASIADOS_INTENTOS = "Superaste los intentos. Pide un código nuevo."


@router.post(
    "/password-reset/request",
    response_model=MensajeOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Envia un codigo para cambiar la contrasena",
)
def request_password_reset(
    datos: PasswordResetRequest,
    session: SessionDep,
    settings: SettingsDep,
    mailer: MailerDep,
    limites: AuthLimitersDep,
    ip: ClientIpDep,
) -> MensajeOut:
    # Cada cuenta ya espera un minuto entre codigos; esto frena a quien pide
    # codigos para muchos correos desde una misma IP.
    _frenar(limites.reset_requests_per_ip.retry_after(ip))
    limites.reset_requests_per_ip.record(ip)
    # La respuesta no dice si el correo tiene cuenta (SRS 3.5).
    auth_service.request_password_reset(
        session, email=datos.email, mailer=mailer, settings=settings
    )
    return MensajeOut(detail=CODIGO_ENVIADO)


@router.post(
    "/password-reset/confirm",
    response_model=TokenOut,
    summary="Cambia la contrasena con el codigo y abre una sesion",
)
def confirm_password_reset(
    datos: PasswordResetConfirm,
    session: SessionDep,
    settings: SettingsDep,
    limites: AuthLimitersDep,
    ip: ClientIpDep,
) -> TokenOut:
    # Cada codigo admite pocos intentos; esto frena a quien prueba codigos
    # contra muchas cuentas desde una misma IP.
    _frenar(limites.reset_failures_per_ip.retry_after(ip))
    try:
        user = auth_service.confirm_password_reset(
            session,
            email=datos.email,
            code=datos.code,
            new_password=datos.password,
            settings=settings,
        )
    except auth_service.InvalidResetCodeError:
        # El intento fallido cuenta: se guarda antes de responder.
        limites.reset_failures_per_ip.record(ip)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=CODIGO_INVALIDO
        ) from None
    except auth_service.TooManyResetAttemptsError:
        limites.reset_failures_per_ip.record(ip)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=DEMASIADOS_INTENTOS
        ) from None
    session.commit()
    emitido = auth_service.issue_token(user, settings, larga=datos.mantener_sesion)
    return TokenOut(
        access_token=emitido.access_token,
        expires_in=emitido.expires_in,
        user=UserOut.model_validate(emitido.user),
    )
