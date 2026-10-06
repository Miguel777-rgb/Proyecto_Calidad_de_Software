"""Conceptos de los avisos a usuarios (RF-03).

Sin dependencias de base de datos, de FastAPI ni de correo: aqui vive lo que
un aviso ES. Como se guarda lo decide `repositories`, y como se entrega,
`services.channels`. La capa de persistencia importa estos tipos, y no al
reves, de modo que la logica de avisos se prueba sin levantar PostgreSQL.
"""

from __future__ import annotations

import enum
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import NamedTuple

from ola.domain.messages import AlertMessage, alert_closed, alert_opened


class NotificationChannel(enum.StrEnum):
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationKind(enum.StrEnum):
    """Momento del episodio que motiva el aviso."""

    OPENED = "opened"
    CLOSED = "closed"


class NotificationStatus(enum.StrEnum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class PendingRow(NamedTuple):
    """Un aviso por registrar: episodio, destinatario, canal y momento."""

    alert_event_id: int
    user_id: int
    channel: NotificationChannel
    kind: NotificationKind


def plan_rows(
    pairs: Iterable[tuple[int, int]],
    kind: NotificationKind,
    channels: Sequence[NotificationChannel],
) -> list[PendingRow]:
    """Un aviso por cada par (episodio, usuario) y por cada canal."""
    return [
        PendingRow(alert_event_id=event_id, user_id=user_id, channel=channel, kind=kind)
        for event_id, user_id in pairs
        for channel in channels
    ]


@dataclass(frozen=True)
class AlertFacts:
    """Datos del episodio que necesita el texto de un aviso."""

    zona: str
    state: str
    started_on: date
    ended_on: date
    streak_length: int
    peak_anomaly_c: Decimal


def _opened(facts: AlertFacts) -> AlertMessage:
    return alert_opened(
        zona=facts.zona,
        state=facts.state,
        started_on=facts.started_on,
        streak_length=facts.streak_length,
        peak_anomaly_c=facts.peak_anomaly_c,
    )


def _closed(facts: AlertFacts) -> AlertMessage:
    return alert_closed(
        zona=facts.zona,
        state=facts.state,
        started_on=facts.started_on,
        ended_on=facts.ended_on,
    )


# Un tipo de aviso nuevo se anade aqui, sin tocar a quien envia.
COMPOSERS: dict[NotificationKind, Callable[[AlertFacts], AlertMessage]] = {
    NotificationKind.OPENED: _opened,
    NotificationKind.CLOSED: _closed,
}


def compose(kind: NotificationKind, facts: AlertFacts) -> AlertMessage:
    """Redacta el aviso que corresponde a ese momento del episodio."""
    return COMPOSERS[kind](facts)


@dataclass(frozen=True)
class Recipient:
    user_id: int
    email: str


@dataclass(frozen=True)
class OutboundNotice:
    """Un aviso listo para entregar, ya separado de como esta guardado."""

    id: int
    channel: NotificationChannel
    recipient: Recipient
    message: AlertMessage
