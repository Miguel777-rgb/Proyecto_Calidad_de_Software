"""Proyeccion de tendencia por zona (RF-02)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from ola.db.models import Laboratory
from ola.domain.projection import (
    DEFAULT_HORIZON,
    DEFAULT_WINDOW,
    MAX_HORIZON,
    MIN_HORIZON,
    Confidence,
    NotEnoughDataError,
    Projection,
    assess_confidence,
    linear_regression,
    weighted_moving_average,
)
from ola.domain.types import Reading
from ola.repositories import labs_repo, readings_repo
from ola.services.settings_service import EffectiveSettings

# El grafico muestra exactamente las mediciones con las que se ajusto el
# modelo: asi se ve de donde sale la estimacion, sin contexto de mas que
# empequenezca el tramo proyectado.
HISTORY_POINTS = DEFAULT_WINDOW


class UnknownLaboratoryError(ValueError):
    def __init__(self, code: str) -> None:
        super().__init__(f"No existe un laboratorio con el codigo '{code}'.")


class InvalidHorizonError(ValueError):
    def __init__(self) -> None:
        super().__init__(f"El horizonte debe estar entre {MIN_HORIZON} y {MAX_HORIZON} dias.")


@dataclass(frozen=True)
class LabProjection:
    laboratory: Laboratory
    reference_date: date | None
    last_measured_on: date | None
    horizon_days: int
    window: int
    confidence: Confidence
    history: list[Reading]
    linear: Projection | None
    weighted: Projection | None
    unavailable_reason: str | None


def get_projection(
    session: Session,
    code: str,
    config: EffectiveSettings,
    *,
    horizon_days: int = DEFAULT_HORIZON,
    window: int = DEFAULT_WINDOW,
) -> LabProjection:
    if not (MIN_HORIZON <= horizon_days <= MAX_HORIZON):
        raise InvalidHorizonError

    laboratorio = labs_repo.get_by_code(session, code)
    if laboratorio is None:
        raise UnknownLaboratoryError(code)

    referencia = readings_repo.reference_date(session)

    # Se toman las ultimas mediciones DISPONIBLES, no las de los ultimos N
    # dias: una zona descontinuada igual se proyecta, marcada con confianza
    # baja, tal como se acordo. Sus fechas proyectadas parten de su propio
    # ultimo dato, que es la senal mas clara de que la serie esta vieja.
    serie = readings_repo.series(session, laboratorio.id)[-window:]
    ultima = serie[-1].measured_on if serie else None

    confianza = (
        assess_confidence(
            serie,
            reference_date=referencia,
            window=window,
            freshness_days=config.freshness_days,
        )
        if referencia is not None
        else Confidence.LOW
    )

    lineal: Projection | None
    ponderada: Projection | None
    try:
        lineal = linear_regression(
            serie, horizon_days=horizon_days, window=window, threshold_c=config.threshold_c
        )
        ponderada = weighted_moving_average(
            serie, horizon_days=horizon_days, window=window, threshold_c=config.threshold_c
        )
        motivo = None
    except NotEnoughDataError as exc:
        lineal = ponderada = None
        motivo = str(exc)

    return LabProjection(
        laboratory=laboratorio,
        reference_date=referencia,
        last_measured_on=ultima,
        horizon_days=horizon_days,
        window=window,
        confidence=confianza,
        history=serie,
        linear=lineal,
        weighted=ponderada,
        unavailable_reason=motivo,
    )


def days_behind(proyeccion: LabProjection) -> int | None:
    """Cuantos dias de retraso lleva el dato de la zona."""
    if proyeccion.reference_date is None or proyeccion.last_measured_on is None:
        return None
    return (proyeccion.reference_date - proyeccion.last_measured_on).days


__all__ = [
    "DEFAULT_HORIZON",
    "DEFAULT_WINDOW",
    "MAX_HORIZON",
    "MIN_HORIZON",
    "InvalidHorizonError",
    "LabProjection",
    "UnknownLaboratoryError",
    "days_behind",
    "get_projection",
]
