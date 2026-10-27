"""Avisos a los usuarios suscritos (RF-03).

El envio esta separado en dos pasos a proposito:

1. Al evaluar las alertas se REGISTRAN los avisos pendientes. Es rapido y no
   depende del servidor de correo.
2. Un endpoint de administrador dispara el ENVIO. Asi un servidor lento o
   caido no bloquea ni hace fallar la evaluacion, y los fallos quedan
   visibles para reintentar.

Este modulo solo coordina y fija el limite de cada transaccion. Que avisos
corresponden lo decide `domain.notices`; como se guardan, `repositories`;
como se entregan, `services.channels`; y que pasa cuando una entrega falla,
`services.notification_dispatcher`.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.orm import Session

from ola.clock import Clock, SystemClock
from ola.domain.notices import NotificationChannel, NotificationKind, plan_rows
from ola.mail import Mailer
from ola.repositories import alerts_repo, notifications_repo, subscriptions_repo
from ola.repositories.notifications_repo import SqlNotificationStore
from ola.services.channels import ChannelRegistry, default_channels
from ola.services.notification_dispatcher import NotificationDispatcher, SendSummary

__all__ = [
    "SendSummary",
    "create_for_events",
    "dispatch_pending",
    "mark_all_read",
    "mark_read",
    "notify_open_alerts_of",
    "send_pending",
]

# Cada episodio se registra en todos los canales que el sistema conoce.
CANALES: tuple[NotificationChannel, ...] = tuple(NotificationChannel)


def create_for_events(
    session: Session, *, opened_ids: Sequence[int] = (), closed_ids: Sequence[int] = ()
) -> int:
    """Registra los avisos pendientes de los episodios indicados.

    Devuelve cuantos se crearon realmente: los que ya existian se ignoran, de
    modo que llamar dos veces no duplica nada.
    """
    filas = []
    for tipo, ids in ((NotificationKind.OPENED, opened_ids), (NotificationKind.CLOSED, closed_ids)):
        for event_id, laboratory_id in alerts_repo.laboratories_of(session, ids):
            suscritos = subscriptions_repo.subscribers_of(session, laboratory_id)
            filas += plan_rows(((event_id, user_id) for user_id in suscritos), tipo, CANALES)

    if not filas:
        return 0

    creados = notifications_repo.insert_pending(session, filas)
    session.commit()
    return creados


def notify_open_alerts_of(session: Session, user_id: int, laboratory_id: int) -> int:
    """Avisa de la alerta vigente de una zona a quien acaba de suscribirse.

    Sin esto, quien se suscribe a una zona que YA esta en alerta no se entera
    hasta que el episodio termine, que no es lo que espera: en CALLAO hay uno
    abierto desde abril. La restriccion de unicidad evita duplicar el aviso si
    la persona se da de baja y se vuelve a suscribir.

    No confirma la transaccion: lo hace quien registra la suscripcion.
    """
    vigentes = alerts_repo.open_event_ids(session, laboratory_id)
    filas = plan_rows(
        ((event_id, user_id) for event_id in vigentes), NotificationKind.OPENED, CANALES
    )
    return notifications_repo.insert_pending(session, filas)


def dispatch_pending(
    session: Session,
    channels: ChannelRegistry,
    *,
    limit: int = 200,
    clock: Clock | None = None,
) -> SendSummary:
    """Entrega los avisos pendientes por los canales recibidos."""
    despachador = NotificationDispatcher(
        SqlNotificationStore(session), channels, clock or SystemClock()
    )
    resumen = despachador.send_pending(limit=limit)
    session.commit()
    return resumen


def send_pending(
    session: Session, mailer: Mailer, *, limit: int = 200, clock: Clock | None = None
) -> SendSummary:
    """Envia los correos pendientes y los que fallaron en un intento anterior."""
    return dispatch_pending(session, default_channels(mailer), limit=limit, clock=clock)


def mark_read(
    session: Session, notification_id: int, user_id: int, *, clock: Clock | None = None
) -> bool:
    notificacion = notifications_repo.get_for_user(session, notification_id, user_id)
    if notificacion is None:
        return False
    if notificacion.read_at is None:
        notificacion.read_at = (clock or SystemClock()).now()
        session.commit()
    return True


def mark_all_read(session: Session, user_id: int, *, clock: Clock | None = None) -> int:
    pendientes = notifications_repo.list_for_user(session, user_id, only_unread=True, limit=500)
    ahora = (clock or SystemClock()).now()
    for notificacion in pendientes:
        notificacion.read_at = ahora
    session.commit()
    return len(pendientes)
