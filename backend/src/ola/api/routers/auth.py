"""Registro, inicio de sesion y perfil (RF-07)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ola.api.deps import CurrentUser, MailerDep, SessionDep, SettingsDep
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
def login(datos: UserLogin, session: SessionDep, settings: SettingsDep) -> TokenOut:
    try:
        user = auth_service.authenticate(session, email=datos.email, password=datos.password)
    except auth_service.InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        ) from None
    except auth_service.InactiveUserError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está desactivada.",
        ) from None
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
    datos: PasswordResetRequest, session: SessionDep, settings: SettingsDep, mailer: MailerDep
) -> MensajeOut:
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
    datos: PasswordResetConfirm, session: SessionDep, settings: SettingsDep
) -> TokenOut:
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
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=CODIGO_INVALIDO
        ) from None
    except auth_service.TooManyResetAttemptsError:
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
