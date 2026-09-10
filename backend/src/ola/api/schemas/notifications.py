"""Esquemas de suscripciones y avisos (RF-03, RF-07)."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from ola.api.schemas.labs import LaboratoryOut
from ola.db.models import (
    Notification,
    NotificationKind,
    NotificationStatus,
    Subscription,
)


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    laboratory: LaboratoryOut
    created_at: datetime

    @classmethod
    def from_subscription(cls, suscripcion: Subscription) -> SubscriptionOut:
        return cls(
            id=suscripcion.id,
            laboratory=LaboratoryOut.model_validate(suscripcion.laboratory),
            created_at=suscripcion.created_at,
        )


class SubscriptionIn(BaseModel):
    laboratory_code: str


class NotificationOut(BaseModel):
    id: int
    laboratory_code: str
    laboratory_name: str
    kind: NotificationKind
    alert_state: str
    started_on: date
    ended_on: date
    streak_length: int
    created_at: datetime
    read_at: datetime | None

    @classmethod
    def from_notification(cls, aviso: Notification) -> NotificationOut:
        evento = aviso.alert_event
        return cls(
            id=aviso.id,
            laboratory_code=evento.laboratory.code,
            laboratory_name=evento.laboratory.name,
            kind=aviso.kind,
            alert_state=evento.state.value,
            started_on=evento.started_on,
            ended_on=evento.ended_on,
            streak_length=evento.streak_length,
            created_at=aviso.created_at,
            read_at=aviso.read_at,
        )


class NotificationListOut(BaseModel):
    unread: int
    items: list[NotificationOut]


class SendSummaryOut(BaseModel):
    attempted: int
    sent: int
    failed: int
    by_status: dict[str, int]


class NotificationStatusOut(BaseModel):
    status: NotificationStatus
