"""Parametros ajustables por el administrador (RF-01)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from ola.api.deps import AdminUser, EffectiveSettingsDep, SessionDep, SettingsDep
from ola.api.schemas.alerts import EvaluationSummaryOut
from ola.services import refresh_service, settings_service

router = APIRouter(prefix="/api/settings", tags=["configuracion"])


@router.get("", summary="Parametros vigentes")
def get_settings_endpoint(config: EffectiveSettingsDep) -> dict[str, object]:
    return config.as_dict()


@router.put("", summary="Actualiza los parametros")
def update_settings(
    cambios: dict[str, Any],
    session: SessionDep,
    settings: SettingsDep,
    admin: AdminUser,
) -> dict[str, object]:
    try:
        settings_service.update(session, cambios, updated_by_id=admin.id)
    except settings_service.InvalidSettingError as exc:
        # Se usa el codigo literal: la constante de Starlette para 422
        # cambio de nombre y quedo obsoleta.
        raise HTTPException(status_code=422, detail=str(exc)) from None
    session.commit()

    # Los episodios guardados se detectaron con los parametros anteriores:
    # sin reevaluar, el mapa seguiria mostrando alertas que ya no cumplen.
    config = settings_service.get_effective(session, settings)
    evaluacion = EvaluationSummaryOut.from_refresh(refresh_service.refresh_alerts(session, config))
    return {**config.as_dict(), "evaluation": evaluacion.model_dump(mode="json")}
