"""Tipos del dominio termico. Sin dependencias de base de datos ni de FastAPI."""

from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import NamedTuple


class ThermalState(enum.StrEnum):
    WARM = "warm"
    NEUTRAL = "neutral"
    COLD = "cold"
    # Zona sin mediciones lo bastante recientes: no se clasifica ni alerta.
    NO_DATA = "no_data"

    @property
    def is_anomalous(self) -> bool:
        """Cierto para los estados que pueden formar una racha (RF-01)."""
        return self in (ThermalState.WARM, ThermalState.COLD)


class Reading(NamedTuple):
    measured_on: date
    anomaly_c: Decimal


@dataclass(frozen=True)
class StreakConfig:
    """Parametros de deteccion de tendencia sostenida (RF-01).

    `max_gap_days` cuenta DIAS FALTANTES entre dos mediciones consecutivas.
    Con el valor por defecto de 2, medir el 30-jul y luego el 2-ago mantiene
    la racha (faltan dos dias); tres o mas dias faltantes la rompen.
    """

    threshold_c: Decimal = Decimal("0.5")
    min_records: int = 5
    max_gap_days: int = 2

    def __post_init__(self) -> None:
        if self.threshold_c <= 0:
            raise ValueError("El umbral debe ser mayor que cero.")
        if self.min_records < 2:
            raise ValueError("La racha minima debe ser de al menos 2 registros.")
        if self.max_gap_days < 0:
            raise ValueError("La tolerancia de huecos no puede ser negativa.")


@dataclass(frozen=True)
class Streak:
    """Un episodio de anomalia sostenida."""

    state: ThermalState
    started_on: date
    ended_on: date
    length: int
    peak_anomaly_c: Decimal
