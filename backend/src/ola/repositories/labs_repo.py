"""Acceso a datos del catalogo de laboratorios costeros."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ola.db.models import Laboratory


def list_all(session: Session, *, only_active: bool = False) -> list[Laboratory]:
    consulta = select(Laboratory).order_by(Laboratory.latitude.desc())
    if only_active:
        consulta = consulta.where(Laboratory.is_active.is_(True))
    return list(session.scalars(consulta))


def get_by_code(session: Session, code: str) -> Laboratory | None:
    return session.scalar(select(Laboratory).where(Laboratory.code == code.strip().upper()))


def code_to_id(session: Session) -> dict[str, int]:
    """Mapa codigo -> id, para traducir las filas del CSV sin una consulta por fila."""
    return dict(session.execute(select(Laboratory.code, Laboratory.id)).all())  # type: ignore[arg-type]
