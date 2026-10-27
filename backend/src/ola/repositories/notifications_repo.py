"""Acceso a datos de los avisos enviados a los usuarios (RF-03)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import desc, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, joinedload

from ola.db.models import AlertEvent, Notification
from ola.domain.notices import (
    AlertFacts,
    NotificationChannel,
    NotificationStatus,
    OutboundNotice,
    PendingRow,
    Recipient,
    compose,
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


def insert_pending(session: Session, rows: Sequence[PendingRow]) -> int:
    """Registra avisos pendientes y devuelve cuantos se crearon realmente.

    La restriccion de unicidad descarta los que ya existian, de modo que
    registrar dos veces el mismo episodio no duplica nada.
    """
    if not rows:
        return 0
    creados = session.execute(
        insert(Notification)
        .values([{**row._asdict(), "status": NotificationStatus.PENDING} for row in rows])
        .on_conflict_do_nothing(constraint="uq_notification_unica")
        .returning(Notification.id)
    ).scalars()
    return len(list(creados))


def _to_notice(notificacion: Notification) -> OutboundNotice:
    evento = notificacion.alert_event
    hechos = AlertFacts(
        zona=evento.laboratory.name,
        state=evento.state.value,
        started_on=evento.started_on,
        ended_on=evento.ended_on,
        streak_length=evento.streak_length,
        peak_anomaly_c=evento.peak_anomaly_c,
    )
    return OutboundNotice(
        id=notificacion.id,
        channel=notificacion.channel,
        recipient=Recipient(user_id=notificacion.user_id, email=notificacion.user.email),
        message=compose(notificacion.kind, hechos),
    )


class SqlNotificationStore:
    """Almacen de avisos sobre PostgreSQL: lo que el despachador necesita y nada mas."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def pending(
        self, channels: Sequence[NotificationChannel], *, limit: int
    ) -> list[OutboundNotice]:
        if not channels:
            return []
        filas = self._session.scalars(
            select(Notification)
            .options(
                joinedload(Notification.alert_event).joinedload(AlertEvent.laboratory),
                joinedload(Notification.user),
            )
            .where(
                Notification.channel.in_(channels),
                Notification.status.in_([NotificationStatus.PENDING, NotificationStatus.FAILED]),
            )
            .order_by(Notification.id)
            .limit(limit)
        )
        return [_to_notice(fila) for fila in filas]

    def _get(self, notice_id: int) -> Notification:
        # Ya esta en la sesion desde `pending`, asi que no vuelve a consultar.
        return self._session.get_one(Notification, notice_id)

    def mark_sent(self, notice_id: int, at: datetime) -> None:
        notificacion = self._get(notice_id)
        notificacion.status = NotificationStatus.SENT
        notificacion.error = None
        notificacion.sent_at = at

    def mark_failed(self, notice_id: int, reason: str) -> None:
        notificacion = self._get(notice_id)
        notificacion.status = NotificationStatus.FAILED
        notificacion.error = reason


def count_by_status(session: Session) -> dict[str, int]:
    filas = session.execute(
        select(Notification.status, func.count())
        .where(Notification.channel == NotificationChannel.EMAIL)
        .group_by(Notification.status)
    ).all()
    return {estado.value: total for estado, total in filas}
