"""Acceso a datos de los avisos enviados a los usuarios (RF-03)."""

from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from ola.db.models import (
    AlertEvent,
    Notification,
    NotificationChannel,
    NotificationStatus,
)


def list_for_user(
    session: Session, user_id: int, *, only_unread: bool = False, limit: int = 50
) -> list[Notification]:
    consulta = (
        select(Notification)
        .options(joinedload(Notification.alert_event).joinedload(AlertEvent.laboratory))
        .where(
            Notification.user_id == user_id,
            Notification.channel == NotificationChannel.IN_APP,
        )
    )
    if only_unread:
        consulta = consulta.where(Notification.read_at.is_(None))
    return list(session.scalars(consulta.order_by(desc(Notification.created_at)).limit(limit)))


def count_unread(session: Session, user_id: int) -> int:
    return (
        session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.channel == NotificationChannel.IN_APP,
                Notification.read_at.is_(None),
            )
        )
        or 0
    )


def get_for_user(session: Session, notification_id: int, user_id: int) -> Notification | None:
    return session.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
    )


def pending_emails(session: Session, *, limit: int = 200) -> list[Notification]:
    """Correos por enviar, incluidos los que fallaron en un intento anterior."""
    return list(
        session.scalars(
            select(Notification)
            .options(
                joinedload(Notification.alert_event).joinedload(AlertEvent.laboratory),
                joinedload(Notification.user),
            )
            .where(
                Notification.channel == NotificationChannel.EMAIL,
                Notification.status.in_([NotificationStatus.PENDING, NotificationStatus.FAILED]),
            )
            .order_by(Notification.id)
            .limit(limit)
        )
    )


def count_by_status(session: Session) -> dict[str, int]:
    filas = session.execute(
        select(Notification.status, func.count())
        .where(Notification.channel == NotificationChannel.EMAIL)
        .group_by(Notification.status)
    ).all()
    return {estado.value: total for estado, total in filas}
