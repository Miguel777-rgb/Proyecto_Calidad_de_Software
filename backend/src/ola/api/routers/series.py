"""Series historicas y comparacion entre zonas (RF-05, RF-06)."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from ola.api.deps import SessionDep
from ola.api.schemas.series import SeriesOut
from ola.services import series_service

router = APIRouter(tags=["series"])

DesdeQuery = Annotated[
    date | None, Query(alias="from", description="Fecha inicial. Por omision, 90 dias atras.")
]
HastaQuery = Annotated[
    date | None,
    Query(alias="to", description="Fecha final. Por omision, la del dato mas reciente."),
]


def _resolver(
    session: SessionDep, codes: list[str], desde: date | None, hasta: date | None
) -> series_service.SeriesResult:
    try:
        return series_service.get_series(session, codes, since=desde, until=hasta)
    except series_service.UnknownLaboratoryError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from None
    except (series_service.InvalidRangeError, series_service.TooManyLaboratoriesError) as exc:
        # Codigo literal: la constante de Starlette para 422 quedo obsoleta.
        raise HTTPException(status_code=422, detail=str(exc)) from None


@router.get(
    "/api/laboratories/{code}/readings",
    response_model=SeriesOut,
    summary="Serie historica de una zona",
)
def laboratory_series(
    code: str, session: SessionDep, desde: DesdeQuery = None, hasta: HastaQuery = None
) -> SeriesOut:
    return SeriesOut.from_result(_resolver(session, [code], desde, hasta))


@router.get(
    "/api/readings/compare",
    response_model=SeriesOut,
    summary="Compara varias zonas en un mismo periodo",
)
def compare_series(
    session: SessionDep,
    labs: Annotated[
        str,
        Query(
            description=(
                "Codigos separados por coma, hasta "
                f"{series_service.MAX_COMPARE_LABS}. Ejemplo: CALLAO,PISCO"
            )
        ),
    ],
    desde: DesdeQuery = None,
    hasta: HastaQuery = None,
) -> SeriesOut:
    codigos = [c.strip() for c in labs.split(",") if c.strip()]
    if not codigos:
        raise HTTPException(status_code=422, detail="Indica al menos una zona a comparar.")
    return SeriesOut.from_result(_resolver(session, codigos, desde, hasta))
