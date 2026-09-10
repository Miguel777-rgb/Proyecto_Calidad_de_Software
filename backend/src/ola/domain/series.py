"""Agrupacion temporal de las series de anomalia (RF-05, RF-06).

Logica pura: decide con que resolucion agrupar un rango de fechas, calcula a
que periodo pertenece cada dia y rellena los periodos sin dato.

Rellenar los huecos con `None` es lo que permite que el grafico CORTE la
linea en lugar de unir dos puntos separados por meses o anos: unirlos
dibujaria una tendencia que nadie midio. HUACHO, por ejemplo, tiene un hueco
de 1127 dias que quedaria como una recta perfecta y enganosa.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

# Limites en dias para elegir la resolucion. Con estos cortes, el navegador
# nunca recibe mas de unos cientos de puntos y se cumple el requisito de
# rendimiento de 3 segundos de la SRS.
DIAS_MAXIMOS_DIARIO = 366
DIAS_MAXIMOS_SEMANAL = 366 * 5


class Resolution(enum.StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


@dataclass(frozen=True)
class SeriesPoint:
    period: date
    anomaly_c: Decimal | None
    samples: int = 0


def choose_resolution(since: date, until: date) -> Resolution:
    """Elige la resolucion segun la amplitud del rango.

    El usuario no elige: pedir dato diario de 56 anos son mas de 20 mil puntos
    y el grafico se vuelve inmanejable.
    """
    dias = (until - since).days + 1
    if dias <= DIAS_MAXIMOS_DIARIO:
        return Resolution.DAILY
    if dias <= DIAS_MAXIMOS_SEMANAL:
        return Resolution.WEEKLY
    return Resolution.MONTHLY


def bucket_start(day: date, resolution: Resolution) -> date:
    """Primer dia del periodo al que pertenece una fecha."""
    if resolution is Resolution.DAILY:
        return day
    if resolution is Resolution.WEEKLY:
        # Semana ISO: empieza el lunes.
        return day - timedelta(days=day.weekday())
    return day.replace(day=1)


def next_bucket(period: date, resolution: Resolution) -> date:
    if resolution is Resolution.DAILY:
        return period + timedelta(days=1)
    if resolution is Resolution.WEEKLY:
        return period + timedelta(days=7)
    if period.month == 12:
        return period.replace(year=period.year + 1, month=1)
    return period.replace(month=period.month + 1)


def iter_buckets(since: date, until: date, resolution: Resolution) -> list[date]:
    """Todos los periodos del rango, incluidos los que no tienen dato."""
    periodos: list[date] = []
    actual = bucket_start(since, resolution)
    fin = bucket_start(until, resolution)
    while actual <= fin:
        periodos.append(actual)
        actual = next_bucket(actual, resolution)
    return periodos


def fill_gaps(
    points: list[SeriesPoint], *, since: date, until: date, resolution: Resolution
) -> list[SeriesPoint]:
    """Devuelve la serie completa, con `None` en los periodos sin medicion."""
    por_periodo = {p.period: p for p in points}
    return [
        por_periodo.get(periodo, SeriesPoint(periodo, None, 0))
        for periodo in iter_buckets(since, until, resolution)
    ]
