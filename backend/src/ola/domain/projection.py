"""Proyeccion de tendencia a corto plazo (RF-02).

Se implementan los DOS metodos que admite el requisito, para poder
compararlos: la regresion lineal proyecta hacia donde apunta la tendencia; la
media movil ponderada proyecta el nivel reciente tipico. Que difieran es
informativo: si ambas coinciden, la situacion es estable.

Es logica pura y determinista: recibe mediciones y una fecha, y no consulta
la base ni el reloj.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from ola.domain.classification import classify
from ola.domain.types import Reading, ThermalState

PRECISION = Decimal("0.0001")

# Ventana de mediciones sobre la que se ajusta cada modelo.
DEFAULT_WINDOW = 30

# Horizonte por defecto. La SRS admite de 3 a 7 dias.
DEFAULT_HORIZON = 5
MIN_HORIZON = 3
MAX_HORIZON = 7

# Por debajo de este numero de mediciones no se puede ajustar nada razonable.
MIN_RECORDS = 3

# Umbrales de cobertura para calificar la confianza.
COBERTURA_ALTA = 0.7
COBERTURA_MEDIA = 0.4


class ProjectionMethod(enum.StrEnum):
    LINEAR = "linear_regression"
    WEIGHTED = "weighted_moving_average"


class Confidence(enum.StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True)
class ProjectedPoint:
    projected_on: date
    anomaly_c: Decimal


@dataclass(frozen=True)
class Projection:
    method: ProjectionMethod
    points: list[ProjectedPoint]
    final_state: ThermalState

    @property
    def final_value(self) -> Decimal:
        return self.points[-1].anomaly_c


class NotEnoughDataError(ValueError):
    def __init__(self, disponibles: int) -> None:
        self.disponibles = disponibles
        super().__init__(
            f"Se necesitan al menos {MIN_RECORDS} mediciones para proyectar; hay {disponibles}."
        )


def _redondear(valor: float) -> Decimal:
    return Decimal(str(valor)).quantize(PRECISION, rounding=ROUND_HALF_UP)


def _ventana(readings: list[Reading], window: int) -> list[Reading]:
    return sorted(readings, key=lambda r: r.measured_on)[-window:]


def _fechas_proyectadas(desde: date, horizon_days: int) -> list[date]:
    return [desde + timedelta(days=i) for i in range(1, horizon_days + 1)]


def linear_regression(
    readings: list[Reading],
    *,
    horizon_days: int = DEFAULT_HORIZON,
    window: int = DEFAULT_WINDOW,
    threshold_c: Decimal = Decimal("0.5"),
) -> Projection:
    """Ajusta una recta por minimos cuadrados y la extiende.

    Proyecta la TENDENCIA: si la anomalia viene subiendo, la estimacion sigue
    subiendo. Es lo que distingue este metodo del promedio ponderado.
    """
    muestras = _ventana(readings, window)
    if len(muestras) < MIN_RECORDS:
        raise NotEnoughDataError(len(muestras))

    # Se usa el dia como numero ordinal para que los huecos cuenten: dos
    # mediciones separadas por una semana no pesan igual que dos seguidas.
    xs = [float(r.measured_on.toordinal()) for r in muestras]
    ys = [float(r.anomaly_c) for r in muestras]
    n = len(muestras)
    media_x = sum(xs) / n
    media_y = sum(ys) / n

    varianza = sum((x - media_x) ** 2 for x in xs)
    if varianza == 0:
        # Todas las mediciones el mismo dia: no hay pendiente que estimar.
        pendiente = 0.0
    else:
        covarianza = sum((x - media_x) * (y - media_y) for x, y in zip(xs, ys, strict=True))
        pendiente = covarianza / varianza
    interseccion = media_y - pendiente * media_x

    ultima = muestras[-1].measured_on
    puntos = [
        ProjectedPoint(dia, _redondear(pendiente * dia.toordinal() + interseccion))
        for dia in _fechas_proyectadas(ultima, horizon_days)
    ]
    return Projection(
        method=ProjectionMethod.LINEAR,
        points=puntos,
        final_state=classify(puntos[-1].anomaly_c, threshold_c),
    )


def weighted_moving_average(
    readings: list[Reading],
    *,
    horizon_days: int = DEFAULT_HORIZON,
    window: int = DEFAULT_WINDOW,
    threshold_c: Decimal = Decimal("0.5"),
) -> Projection:
    """Promedia la ventana dando mas peso a lo reciente y lo proyecta plano.

    Los pesos decrecen linealmente: la medicion mas nueva pesa `n`, la
    anterior `n-1`, y asi hasta 1. Proyecta el NIVEL reciente tipico, no la
    tendencia, por lo que resiste mejor un dia atipico.
    """
    muestras = _ventana(readings, window)
    if len(muestras) < MIN_RECORDS:
        raise NotEnoughDataError(len(muestras))

    n = len(muestras)
    pesos = range(1, n + 1)
    total_pesos = sum(pesos)
    ponderado = sum(float(r.anomaly_c) * p for r, p in zip(muestras, pesos, strict=True))
    promedio = ponderado / total_pesos

    valor = _redondear(promedio)
    ultima = muestras[-1].measured_on
    puntos = [ProjectedPoint(dia, valor) for dia in _fechas_proyectadas(ultima, horizon_days)]
    return Projection(
        method=ProjectionMethod.WEIGHTED,
        points=puntos,
        final_state=classify(valor, threshold_c),
    )


def assess_confidence(
    readings: list[Reading],
    *,
    reference_date: date,
    window: int = DEFAULT_WINDOW,
    freshness_days: int = 7,
) -> Confidence:
    """Califica cuanto fiarse de la proyeccion.

    Se proyecta aunque los datos sean pobres, pero la confianza lo advierte:
    una zona que no mide desde hace anos produce una estimacion con apariencia
    de valida, y esa apariencia es justo el riesgo.
    """
    muestras = _ventana(readings, window)
    if not muestras:
        return Confidence.LOW

    ultima = muestras[-1].measured_on
    if (reference_date - ultima).days > freshness_days:
        return Confidence.LOW

    cobertura = len(muestras) / window
    if cobertura >= COBERTURA_ALTA:
        return Confidence.HIGH
    if cobertura >= COBERTURA_MEDIA:
        return Confidence.MEDIUM
    return Confidence.LOW
