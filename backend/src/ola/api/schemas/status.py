"""Esquemas del estado termico por zona (RF-01, RF-04)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from ola.api.schemas.labs import LaboratoryOut
from ola.domain.types import ThermalState
from ola.services.status_service import SystemStatus, ZoneStatus


class OpenAlertOut(BaseModel):
    id: int
    state: str
    started_on: date
    streak_length: int
    peak_anomaly_c: Decimal


class ZoneStatusOut(BaseModel):
    laboratory: LaboratoryOut
    state: ThermalState
    average_c: Decimal | None
    last_anomaly_c: Decimal | None
    last_measured_on: date | None
    days_since_last: int | None
    is_stale: bool
    open_alert: OpenAlertOut | None

    @classmethod
    def from_zone(cls, zona: ZoneStatus) -> ZoneStatusOut:
        alerta = zona.open_alert
        return cls(
            laboratory=LaboratoryOut.model_validate(zona.laboratory),
            state=zona.state,
            average_c=zona.average_c,
            last_anomaly_c=zona.last_anomaly_c,
            last_measured_on=zona.last_measured_on,
            days_since_last=zona.days_since_last,
            is_stale=zona.is_stale,
            open_alert=None
            if alerta is None
            else OpenAlertOut(
                id=alerta.id,
                state=alerta.state.value,
                started_on=alerta.started_on,
                streak_length=alerta.streak_length,
                peak_anomaly_c=alerta.peak_anomaly_c,
            ),
        )


class SystemStatusOut(BaseModel):
    # Fecha del dato mas reciente. La interfaz la muestra siempre, porque la
    # SRS exige avisar cuando el dato no corresponde al dia actual.
    reference_date: date | None
    zones: list[ZoneStatusOut]

    @classmethod
    def from_status(cls, estado: SystemStatus) -> SystemStatusOut:
        return cls(
            reference_date=estado.reference_date,
            zones=[ZoneStatusOut.from_zone(z) for z in estado.zones],
        )
