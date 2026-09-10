"""Catalogo de laboratorios costeros (RF-04)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ola.api.deps import SessionDep
from ola.api.schemas.labs import LaboratoryOut
from ola.repositories import labs_repo

router = APIRouter(prefix="/api/laboratories", tags=["laboratorios"])


@router.get("", response_model=list[LaboratoryOut], summary="Lista las 10 zonas costeras")
def list_laboratories(session: SessionDep, only_active: bool = False) -> list[LaboratoryOut]:
    laboratorios = labs_repo.list_all(session, only_active=only_active)
    return [LaboratoryOut.model_validate(lab) for lab in laboratorios]


@router.get("/{code}", response_model=LaboratoryOut, summary="Devuelve una zona por su codigo")
def get_laboratory(code: str, session: SessionDep) -> LaboratoryOut:
    lab = labs_repo.get_by_code(session, code)
    if lab is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un laboratorio con el codigo '{code}'.",
        )
    return LaboratoryOut.model_validate(lab)
