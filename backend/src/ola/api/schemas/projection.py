"""Esquemas de la proyeccion de tendencia (RF-02)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from ola.api.schemas.labs import LaboratoryOut
from ola.domain.projection import Confidence, Projection, ProjectionMethod
from ola.domain.types import ThermalState
from ola.services.projection_service import LabProjection, days_behind


class ProjectedPointOut(BaseModel):
    projected_on: date
    anomaly_c: Decimal


class HistoryPointOut(BaseModel):
    measured_on: date
    anomaly_c: Decimal


class MethodProjectionOut(BaseModel):
    method: ProjectionMethod
    points: list[ProjectedPointOut]
    final_value: Decimal
    final_state: ThermalState

    @classmethod
    def from_projection(cls, proyeccion: Projection) -> MethodProjectionOut:
        return cls(
            method=proyeccion.method,
            points=[
                ProjectedPointOut(projected_on=p.projected_on, anomaly_c=p.anomaly_c)
                for p in proyeccion.points
            ],
            final_value=proyeccion.final_value,
            final_state=proyeccion.final_state,
        )


class ProjectionOut(BaseModel):
    laboratory: LaboratoryOut
    reference_date: date | None
    last_measured_on: date | None
    days_behind: int | None
    horizon_days: int
    window: int
    confidence: Confidence
    history: list[HistoryPointOut]
    linear: MethodProjectionOut | None
    weighted: MethodProjectionOut | None
    # Las dos estimaciones coinciden cuando la serie es estable; que difieran
    # mucho es en si una senal de incertidumbre.
    agreement_c: Decimal | None
    unavailable_reason: str | None

    @classmethod
    def from_lab_projection(cls, proyeccion: LabProjection) -> ProjectionOut:
        lineal = proyeccion.linear
        ponderada = proyeccion.weighted
        diferencia = (
            abs(lineal.final_value - ponderada.final_value)
            if lineal is not None and ponderada is not None
            else None
        )
        return cls(
            laboratory=LaboratoryOut.model_validate(proyeccion.laboratory),
            reference_date=proyeccion.reference_date,
            last_measured_on=proyeccion.last_measured_on,
            days_behind=days_behind(proyeccion),
            horizon_days=proyeccion.horizon_days,
            window=proyeccion.window,
            confidence=proyeccion.confidence,
            history=[
                HistoryPointOut(measured_on=r.measured_on, anomaly_c=r.anomaly_c)
                for r in proyeccion.history
            ],
            linear=None if lineal is None else MethodProjectionOut.from_projection(lineal),
            weighted=None if ponderada is None else MethodProjectionOut.from_projection(ponderada),
            agreement_c=diferencia,
            unavailable_reason=proyeccion.unavailable_reason,
        )
