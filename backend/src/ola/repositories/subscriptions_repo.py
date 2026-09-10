"""Acceso a datos de las suscripciones a zonas (RF-07)."""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from ola.db.models import Subscription


def list_for_user(session: Session, user_id: int) -> list[Subscription]:
    return list(
        session.scalars(
            select(Subscription)
            .options(joinedload(Subscription.laboratory))
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.id)
        )
    )


def get(session: Session, user_id: int, laboratory_id: int) -> Subscription | None:
    return session.scalar(
        select(Subscription).where(
            Subscription.user_id == user_id, Subscription.laboratory_id == laboratory_id
        )
    )


def add(session: Session, user_id: int, laboratory_id: int) -> Subscription:
    existente = get(session, user_id, laboratory_id)
    if existente is not None:
        return existente
    suscripcion = Subscription(user_id=user_id, laboratory_id=laboratory_id)
    session.add(suscripcion)
    session.flush()
    return suscripcion


def remove(session: Session, user_id: int, laboratory_id: int) -> bool:
    existente = get(session, user_id, laboratory_id)
    if existente is None:
        return False
    session.execute(delete(Subscription).where(Subscription.id == existente.id))
    return True


def subscribers_of(session: Session, laboratory_id: int) -> list[int]:
    """Identificadores de los usuarios suscritos a una zona."""
    return list(
        session.scalars(
            select(Subscription.user_id).where(Subscription.laboratory_id == laboratory_id)
        )
    )
