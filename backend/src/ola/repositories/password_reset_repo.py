"""Acceso a los codigos para recuperar la contrasena (RF-07)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ola.db.models import PasswordResetCode


def latest(session: Session, user_id: int) -> PasswordResetCode | None:
    """El ultimo codigo pedido, usado o no."""
    return session.scalar(
        select(PasswordResetCode)
        .where(PasswordResetCode.user_id == user_id)
        .order_by(PasswordResetCode.created_at.desc(), PasswordResetCode.id.desc())
        .limit(1)
    )


def active(session: Session, user_id: int, now: datetime) -> PasswordResetCode | None:
    """El codigo que se puede usar ahora: el ultimo, sin usar y sin vencer."""
    codigo = latest(session, user_id)
    if codigo is None or codigo.used_at is not None or codigo.expires_at <= now:
        return None
    return codigo


def create(
    session: Session,
    *,
    user_id: int,
    code_hash: str,
    created_at: datetime,
    expires_at: datetime,
) -> PasswordResetCode:
    # Pedir un codigo nuevo anula los anteriores: solo vale el ultimo.
    session.execute(
        update(PasswordResetCode)
        .where(PasswordResetCode.user_id == user_id, PasswordResetCode.used_at.is_(None))
        .values(used_at=created_at)
    )
    codigo = PasswordResetCode(
        user_id=user_id,
        code_hash=code_hash,
        created_at=created_at,
        expires_at=expires_at,
        attempts=0,
    )
    session.add(codigo)
    session.flush()
    return codigo
