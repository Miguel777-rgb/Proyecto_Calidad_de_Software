"""Esquemas de los episodios de anomalia sostenida (RF-01)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from ola.db.models import AlertEvent, AlertState


class AlertEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    laboratory_code: str
    laboratory_name: str
    state: AlertState
    started_on: date
    ended_on: date
    streak_length: int
    peak_anomaly_c: Decimal
    threshold_c: Decimal
    min_streak_records: int
    max_gap_days: int
    is_open: bool
    detected_at: datetime

    @classmethod
    def from_event(cls, evento: AlertEvent) -> AlertEventOut:
        return cls(
            id=evento.id,
            laboratory_code=evento.laboratory.code,
            laboratory_name=evento.laboratory.name,
            state=evento.state,
            started_on=evento.started_on,
            ended_on=evento.ended_on,
            streak_length=evento.streak_length,
            peak_anomaly_c=evento.peak_anomaly_c,
            threshold_c=evento.threshold_c,
            min_streak_records=evento.min_streak_records,
            max_gap_days=evento.max_gap_days,
            is_open=evento.is_open,
            detected_at=evento.detected_at,
        )


class StreakOut(BaseModel):
    state: str
    started_on: date
    ended_on: date
    length: int
    peak_anomaly_c: Decimal


class EvaluationSummaryOut(BaseModel):
    reference_date: date | None
    laboratories_evaluated: int
    events_total: int
    events_open: int
    events_removed: int
