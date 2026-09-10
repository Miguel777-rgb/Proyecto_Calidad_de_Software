"""Hash de contrasenas y emision de tokens (RF-07).

Se usa el paquete `bcrypt` directamente y no `passlib`, porque passlib 1.7.4
falla con bcrypt >= 4.1 al intentar leer `bcrypt.__about__`.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

# bcrypt solo considera los primeros 72 bytes. En lugar de truncar en
# silencio (dos contrasenas distintas darian el mismo hash), se rechaza
# antes: los esquemas de la API validan la longitud maxima.
BCRYPT_MAX_BYTES = 72


class PasswordTooLongError(ValueError):
    def __init__(self) -> None:
        super().__init__(f"La contrasena no puede superar los {BCRYPT_MAX_BYTES} bytes.")


def hash_password(password: str) -> str:
    raw = password.encode("utf-8")
    if len(raw) > BCRYPT_MAX_BYTES:
        raise PasswordTooLongError
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    raw = password.encode("utf-8")
    if len(raw) > BCRYPT_MAX_BYTES:
        return False
    try:
        return bcrypt.checkpw(raw, password_hash.encode("utf-8"))
    except ValueError:
        # El hash almacenado no tiene formato bcrypt valido.
        return False


def create_access_token(
    subject: str,
    *,
    secret: str,
    algorithm: str,
    expires_minutes: int,
    now: datetime | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    issued_at = now or datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": issued_at,
        "exp": issued_at + timedelta(minutes=expires_minutes),
        **(extra_claims or {}),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(token: str, *, secret: str, algorithm: str) -> dict[str, Any]:
    """Devuelve el contenido del token.

    Lanza jwt.PyJWTError (InvalidSignatureError, ExpiredSignatureError, ...)
    si el token no es valido; quien llama decide como responder.
    """
    decoded: dict[str, Any] = jwt.decode(token, secret, algorithms=[algorithm])
    return decoded
