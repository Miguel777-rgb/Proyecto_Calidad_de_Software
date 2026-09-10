"""Proyeccion de tendencia a corto plazo (RF-02)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from ola.api.deps import EffectiveSettingsDep, SessionDep
from ola.api.schemas.projection import ProjectionOut
from ola.services import projection_service

router = APIRouter(tags=["proyeccion"])


@router.get(
    "/api/laboratories/{code}/projection",
    response_model=ProjectionOut,
    summary="Proyecta la tendencia de una zona con dos metodos",
)
def laboratory_projection(
    code: str,
    session: SessionDep,
    config: EffectiveSettingsDep,
    horizon: Annotated[
        int,
        Query(
            ge=projection_service.MIN_HORIZON,
            le=projection_service.MAX_HORIZON,
            description="Dias a proyectar. La SRS admite de 3 a 7.",
        ),
    ] = projection_service.DEFAULT_HORIZON,
    window: Annotated[
        int, Query(ge=5, le=180, description="Mediciones sobre las que se ajusta el modelo.")
    ] = projection_service.DEFAULT_WINDOW,
) -> ProjectionOut:
    try:
        proyeccion = projection_service.get_projection(
            session, code, config, horizon_days=horizon, window=window
        )
    except projection_service.UnknownLaboratoryError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from None
    except projection_service.InvalidHorizonError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None

    return ProjectionOut.from_lab_projection(proyeccion)
