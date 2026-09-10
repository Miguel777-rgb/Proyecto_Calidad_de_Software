"""Clasificacion termica de una anomalia (RF-01, RF-04)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, timedelta
from decimal import Decimal

from ola.domain.types import Reading, ThermalState


def classify(anomaly_c: Decimal, threshold_c: Decimal = Decimal("0.5")) -> ThermalState:
    """Clasifica un valor de anomalia.

    El umbral es exclusivo por ambos lados, siguiendo el criterio de ENFEN:
    exactamente +0.5 o -0.5 se consideran neutros.
    """
    if anomaly_c > threshold_c:
        return ThermalState.WARM
    if anomaly_c < -threshold_c:
        return ThermalState.COLD
    return ThermalState.NEUTRAL


def average_recent(
    readings: Sequence[Reading], *, reference_date: date, window_days: int
) -> Decimal | None:
    """Promedia las mediciones de los ultimos `window_days` dias.

    El color del mapa se calcula sobre este promedio y no sobre la ultima
    medicion, para que un solo dia atipico no haga parpadear la zona.
    Devuelve None si no hay ninguna medicion en la ventana.
    """
    desde = reference_date - timedelta(days=window_days - 1)
    valores = [r.anomaly_c for r in readings if desde <= r.measured_on <= reference_date]
    if not valores:
        return None
    return sum(valores, Decimal(0)) / Decimal(len(valores))
