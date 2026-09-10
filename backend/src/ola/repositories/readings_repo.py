"""Acceso a datos de las mediciones de anomalia."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import Date, cast, func, or_, select
from sqlalchemy.orm import Session

from ola.db.models import AnomalyReading
from ola.domain.series import Resolution, SeriesPoint
from ola.domain.types import Reading


def reference_date(session: Session) -> date | None:
    """Fecha del dato mas reciente de todo el sistema.

    Es la referencia contra la que se mide el estado vigente y la vigencia de
    cada zona. NO se usa el reloj del servidor: IMARPE publica con retraso y
    la hora real dejaria todas las zonas marcadas como obsoletas.
    """
    return session.scalar(select(func.max(AnomalyReading.measured_on)))


def last_measured_on_by_lab(session: Session) -> dict[int, date]:
    filas = session.execute(
        select(AnomalyReading.laboratory_id, func.max(AnomalyReading.measured_on)).group_by(
            AnomalyReading.laboratory_id
        )
    ).all()
    return dict(filas)  # type: ignore[arg-type]


def series(
    session: Session,
    laboratory_id: int,
    *,
    since: date | None = None,
    until: date | None = None,
) -> list[Reading]:
    consulta = select(AnomalyReading.measured_on, AnomalyReading.anomaly_c).where(
        AnomalyReading.laboratory_id == laboratory_id
    )
    if since is not None:
        consulta = consulta.where(AnomalyReading.measured_on >= since)
    if until is not None:
        consulta = consulta.where(AnomalyReading.measured_on <= until)
    consulta = consulta.order_by(AnomalyReading.measured_on)
    return [Reading(fecha, valor) for fecha, valor in session.execute(consulta)]


def count(session: Session) -> int:
    return session.scalar(select(func.count()).select_from(AnomalyReading)) or 0


def series_by_lab(session: Session, *, since: date, until: date) -> dict[int, list[Reading]]:
    """Mediciones de todas las zonas en un rango, agrupadas por laboratorio.

    Evita cargar el historico completo cuando solo hace falta la ventana
    reciente que usa el mapa.
    """
    filas = session.execute(
        select(
            AnomalyReading.laboratory_id,
            AnomalyReading.measured_on,
            AnomalyReading.anomaly_c,
        )
        .where(AnomalyReading.measured_on.between(since, until))
        .order_by(AnomalyReading.laboratory_id, AnomalyReading.measured_on)
    ).all()

    agrupadas: dict[int, list[Reading]] = {}
    for lab_id, fecha, valor in filas:
        agrupadas.setdefault(lab_id, []).append(Reading(fecha, valor))
    return agrupadas


def last_reading_by_lab(session: Session) -> dict[int, Reading]:
    """Ultima medicion de cada zona, con su valor."""
    ultimas = last_measured_on_by_lab(session)
    if not ultimas:
        return {}

    condiciones = [
        (AnomalyReading.laboratory_id == lab_id) & (AnomalyReading.measured_on == fecha)
        for lab_id, fecha in ultimas.items()
    ]
    filas = session.execute(
        select(
            AnomalyReading.laboratory_id, AnomalyReading.measured_on, AnomalyReading.anomaly_c
        ).where(or_(*condiciones))
    ).all()
    return {lab_id: Reading(fecha, valor) for lab_id, fecha, valor in filas}


_TRUNC = {Resolution.WEEKLY: "week", Resolution.MONTHLY: "month"}

# El dataset de IMARPE publica cuatro decimales.
PRECISION = Decimal("0.0001")


def _periodo(resolution: Resolution) -> Any:
    """Expresion SQL del periodo al que pertenece cada medicion.

    Devuelve Any porque el tipo cambia segun la resolucion: una columna del
    modelo o una expresion date_trunc, y los stubs de SQLAlchemy no las
    unifican bajo un mismo tipo.
    """
    if resolution is Resolution.DAILY:
        return AnomalyReading.measured_on
    return cast(func.date_trunc(_TRUNC[resolution], AnomalyReading.measured_on), Date)


def aggregated_series(
    session: Session,
    laboratory_ids: Sequence[int],
    *,
    since: date,
    until: date,
    resolution: Resolution,
) -> dict[int, list[SeriesPoint]]:
    """Promedio de anomalia por periodo y laboratorio.

    El agrupado se hace en PostgreSQL: traer las 16 mil filas de una zona al
    proceso para promediarlas aqui seria mucho mas lento y no aportaria nada.
    """
    if not laboratory_ids:
        return {}

    periodo = _periodo(resolution).label("periodo")
    filas = session.execute(
        select(
            AnomalyReading.laboratory_id,
            periodo,
            func.avg(AnomalyReading.anomaly_c).label("promedio"),
            func.count().label("muestras"),
        )
        .where(
            AnomalyReading.laboratory_id.in_(laboratory_ids),
            AnomalyReading.measured_on.between(since, until),
        )
        .group_by(AnomalyReading.laboratory_id, periodo)
        .order_by(AnomalyReading.laboratory_id, periodo)
    ).all()

    series: dict[int, list[SeriesPoint]] = {lab_id: [] for lab_id in laboratory_ids}
    for lab_id, momento, promedio, muestras in filas:
        series[lab_id].append(
            SeriesPoint(
                period=momento,
                # AVG devuelve muchos mas decimales de los que tiene el dato;
                # se redondea a la precision del dataset original.
                anomaly_c=Decimal(promedio).quantize(PRECISION, rounding=ROUND_HALF_UP),
                samples=muestras,
            )
        )
    return series


def available_range(session: Session, laboratory_id: int) -> tuple[date, date] | None:
    """Primera y ultima medicion de una zona."""
    fila = session.execute(
        select(func.min(AnomalyReading.measured_on), func.max(AnomalyReading.measured_on)).where(
            AnomalyReading.laboratory_id == laboratory_id
        )
    ).one()
    return None if fila[0] is None else (fila[0], fila[1])
