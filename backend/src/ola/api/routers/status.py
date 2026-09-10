"""Estado termico vigente de las zonas (RF-01, RF-04)."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from ola.api.deps import EffectiveSettingsDep, SessionDep
from ola.api.schemas.status import SystemStatusOut
from ola.services import status_service

router = APIRouter(prefix="/api/status", tags=["estado"])


@router.get("", response_model=SystemStatusOut, summary="Estado de las 10 zonas costeras")
def get_status(
    session: SessionDep,
    config: EffectiveSettingsDep,
    as_of: Annotated[
        date | None,
        Query(
            description=(
                "Fecha contra la que medir el estado. Por omision se usa la del dato "
                "mas reciente del sistema, nunca el reloj del servidor."
            )
        ),
    ] = None,
) -> SystemStatusOut:
    return SystemStatusOut.from_status(status_service.get_status(session, config, as_of=as_of))
