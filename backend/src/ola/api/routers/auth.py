"""Registro, inicio de sesion y perfil (RF-07)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ola.api.deps import CurrentUser, SessionDep, SettingsDep
from ola.api.schemas.auth import TokenOut, UserLogin, UserOut, UserRegister
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
    emitido = auth_service.issue_token(user, settings)
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
            detail="Correo o contrasena incorrectos.",
        ) from None
    except auth_service.InactiveUserError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta esta desactivada.",
        ) from None
    emitido = auth_service.issue_token(user, settings)
    return TokenOut(
        access_token=emitido.access_token,
        expires_in=emitido.expires_in,
        user=UserOut.model_validate(emitido.user),
    )


@router.get("/me", response_model=UserOut, summary="Devuelve el usuario de la sesion")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
