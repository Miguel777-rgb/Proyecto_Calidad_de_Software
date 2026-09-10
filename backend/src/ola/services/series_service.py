"""Series historicas y comparacion entre zonas (RF-05, RF-06)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy.orm import Session

from ola.db.models import Laboratory
from ola.domain.series import Resolution, SeriesPoint, choose_resolution, fill_gaps
from ola.repositories import labs_repo, readings_repo

# Rango que se ofrece al abrir el grafico: enfoca la situacion inmediata y
# con dato diario son unos 90 puntos, que se leen bien incluso en un celular.
DEFAULT_RANGE_DAYS = 90

# Tope de series superpuestas en la comparacion (RF-06). Con mas, las lineas
# se solapan y ningun conjunto de colores las distingue bien.
MAX_COMPARE_LABS = 4


class UnknownLaboratoryError(ValueError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(f"No existe un laboratorio con el codigo '{code}'.")


class InvalidRangeError(ValueError):
    pass


class TooManyLaboratoriesError(ValueError):
    def __init__(self) -> None:
        super().__init__(f"Se pueden comparar hasta {MAX_COMPARE_LABS} zonas a la vez.")


@dataclass(frozen=True)
class LabSeries:
    laboratory: Laboratory
    points: list[SeriesPoint]


@dataclass(frozen=True)
class SeriesResult:
    since: date
    until: date
    resolution: Resolution
    series: list[LabSeries]


def default_range(session: Session) -> tuple[date, date]:
    """Ultimos 90 dias contados desde el dato mas reciente, no desde hoy."""
    referencia = readings_repo.reference_date(session) or date.today()
    return referencia - timedelta(days=DEFAULT_RANGE_DAYS - 1), referencia


def get_series(
    session: Session,
    codes: list[str],
    *,
    since: date | None = None,
    until: date | None = None,
) -> SeriesResult:
    if len(codes) > MAX_COMPARE_LABS:
        raise TooManyLaboratoriesError

    por_defecto = default_range(session)
    desde = since or por_defecto[0]
    hasta = until or por_defecto[1]
    if desde > hasta:
        raise InvalidRangeError("La fecha inicial no puede ser posterior a la final.")

    laboratorios: list[Laboratory] = []
    for code in codes:
        lab = labs_repo.get_by_code(session, code)
        if lab is None:
            raise UnknownLaboratoryError(code)
        laboratorios.append(lab)

    resolucion = choose_resolution(desde, hasta)
    crudas = readings_repo.aggregated_series(
        session, [lab.id for lab in laboratorios], since=desde, until=hasta, resolution=resolucion
    )

    return SeriesResult(
        since=desde,
        until=hasta,
        resolution=resolucion,
        series=[
            LabSeries(
                laboratory=lab,
                # Rellenar los periodos vacios permite que el grafico corte la
                # linea en vez de inventar una tendencia sobre el hueco.
                points=fill_gaps(
                    crudas.get(lab.id, []), since=desde, until=hasta, resolution=resolucion
                ),
            )
            for lab in laboratorios
        ],
    )
