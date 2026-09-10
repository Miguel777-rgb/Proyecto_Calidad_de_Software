"""Parametros ajustables por el administrador (RF-01)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from ola.api.deps import AdminUser, EffectiveSettingsDep, SessionDep, SettingsDep
from ola.services import settings_service

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
    return settings_service.get_effective(session, settings).as_dict()
