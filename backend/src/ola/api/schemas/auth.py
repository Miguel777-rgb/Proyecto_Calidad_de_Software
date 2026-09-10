"""Esquemas de entrada y salida para autenticacion (RF-07)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from ola.db.models import UserRole
from ola.security import BCRYPT_MAX_BYTES

# Politica acordada: minimo 8 caracteres y sin reglas de composicion.
# Exigir mayusculas, numeros y simbolos empuja a claves predecibles y
# perjudica al perfil de usuario del sistema (pescador artesanal).
PASSWORD_MIN_LENGTH = 8


class PasswordField(BaseModel):
    password: str = Field(min_length=PASSWORD_MIN_LENGTH)

    @field_validator("password")
    @classmethod
    def _cabe_en_bcrypt(cls, value: str) -> str:
        # El limite de bcrypt es en bytes, no en caracteres: una contrasena
        # con acentos o emoji ocupa mas de un byte por caracter.
        if len(value.encode("utf-8")) > BCRYPT_MAX_BYTES:
            raise ValueError(f"La contrasena es demasiado larga (maximo {BCRYPT_MAX_BYTES} bytes).")
        return value


class UserRegister(PasswordField):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Segundos de vigencia del token.")
    user: UserOut
