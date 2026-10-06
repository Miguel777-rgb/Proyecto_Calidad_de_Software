"""Avisos a los usuarios suscritos (RF-03).

El envio esta separado en dos pasos a proposito:

1. Al evaluar las alertas se REGISTRAN los avisos pendientes. Es rapido y no
   depende del servidor de correo.
2. Un endpoint de administrador dispara el ENVIO. Asi un servidor lento o
   caido no bloquea ni hace fallar la evaluacion, y los fallos quedan
   visibles para reintentar.

La restriccion de unicidad de la tabla es la que impide repetir un aviso: por
mucho que se reevalue, un episodio genera un unico correo por usuario.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, joinedload

from ola.db.models import (
    AlertEvent,
    Notification,
    NotificationChannel,
    NotificationKind,
    NotificationStatus,
)
from ola.domain.messages import AlertMessage, alert_closed, alert_opened
from ola.mail import Email, Mailer
from ola.repositories import notifications_repo, subscriptions_repo

CANALES = (NotificationChannel.EMAIL, NotificationChannel.IN_APP)


@dataclass(frozen=True)
class SendSummary:
    attempted: int
    sent: int
    failed: int


def _eventos(session: Session, ids: Sequence[int]) -> list[AlertEvent]:
    if not ids:
        return []
    return list(
        session.scalars(
            select(AlertEvent)
            .options(joinedload(AlertEvent.laboratory))
            .where(AlertEvent.id.in_(ids))
        )
    )


def create_for_events(
    session: Session, *, opened_ids: Sequence[int] = (), closed_ids: Sequence[int] = ()
) -> int:
    """Registra los avisos pendientes de los episodios indicados.

    Devuelve cuantos se crearon realmente: los que ya existian se ignoran, de
    modo que llamar dos veces no duplica nada.
    """
    filas: list[dict[str, object]] = []

    for tipo, ids in ((NotificationKind.OPENED, opened_ids), (NotificationKind.CLOSED, closed_ids)):
        for evento in _eventos(session, ids):
            for user_id in subscriptions_repo.subscribers_of(session, evento.laboratory_id):
                filas.extend(
                    {
                        "alert_event_id": evento.id,
                        "user_id": user_id,
                        "channel": canal,
                        "kind": tipo,
                        "status": NotificationStatus.PENDING,
                    }
                    for canal in CANALES
                )

    if not filas:
        return 0

    creados = session.execute(
        insert(Notification)
        .values(filas)
        .on_conflict_do_nothing(constraint="uq_notification_unica")
        .returning(Notification.id)
    ).scalars()
    total = len(list(creados))
    session.commit()
    return total


def notify_open_alerts_of(session: Session, user_id: int, laboratory_id: int) -> int:
    """Avisa de la alerta vigente de una zona a quien acaba de suscribirse.

    Sin esto, quien se suscribe a una zona que YA esta en alerta no se entera
    hasta que el episodio termine, que no es lo que espera: en CALLAO hay uno
    abierto desde abril. La restriccion de unicidad evita duplicar el aviso si
    la persona se da de baja y se vuelve a suscribir.
    """
    vigentes = list(
        session.scalars(
            select(AlertEvent).where(
                AlertEvent.laboratory_id == laboratory_id, AlertEvent.is_open.is_(True)
            )
        )
    )
    if not vigentes:
        return 0

    filas = [
        {
            "alert_event_id": evento.id,
            "user_id": user_id,
            "channel": canal,
            "kind": NotificationKind.OPENED,
            "status": NotificationStatus.PENDING,
        }
        for evento in vigentes
        for canal in CANALES
    ]
    creados = session.execute(
        insert(Notification)
        .values(filas)
        .on_conflict_do_nothing(constraint="uq_notification_unica")
        .returning(Notification.id)
    ).scalars()
    return len(list(creados))


def _mensaje(notificacion: Notification) -> AlertMessage:
    evento = notificacion.alert_event
    zona = evento.laboratory.name
    if notificacion.kind is NotificationKind.OPENED:
        return alert_opened(
            zona=zona,
            state=evento.state.value,
            started_on=evento.started_on,
            streak_length=evento.streak_length,
            peak_anomaly_c=evento.peak_anomaly_c,
        )
    return alert_closed(
        zona=zona,
        state=evento.state.value,
        started_on=evento.started_on,
        ended_on=evento.ended_on,
    )


def send_pending(session: Session, mailer: Mailer, *, limit: int = 200) -> SendSummary:
    """Envia los correos pendientes y los que fallaron en un intento anterior.

    Un fallo no detiene la tanda ni pierde el aviso: queda marcado con su
    motivo para que el administrador pueda reintentar.
    """
    pendientes = notifications_repo.pending_emails(session, limit=limit)
    enviados = fallidos = 0

    for notificacion in pendientes:
        mensaje = _mensaje(notificacion)
        try:
            mailer.send(
                Email(to=notificacion.user.email, subject=mensaje.subject, body=mensaje.body)
            )
        except Exception as exc:
            notificacion.status = NotificationStatus.FAILED
            notificacion.error = str(exc)[:500]
            fallidos += 1
        else:
            notificacion.status = NotificationStatus.SENT
            notificacion.error = None
            notificacion.sent_at = datetime.now(UTC)
            enviados += 1

    session.commit()
    return SendSummary(attempted=len(pendientes), sent=enviados, failed=fallidos)


def mark_read(session: Session, notification_id: int, user_id: int) -> bool:
    notificacion = notifications_repo.get_for_user(session, notification_id, user_id)
    if notificacion is None:
        return False
    if notificacion.read_at is None:
        notificacion.read_at = datetime.now(UTC)
        session.commit()
    return True


def mark_all_read(session: Session, user_id: int) -> int:
    pendientes = notifications_repo.list_for_user(session, user_id, only_unread=True, limit=500)
    ahora = datetime.now(UTC)
    for notificacion in pendientes:
        notificacion.read_at = ahora
    session.commit()
    return len(pendientes)
