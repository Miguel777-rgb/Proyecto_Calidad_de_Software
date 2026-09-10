"""Importacion manual del CSV de ATSM (RF-08).

La importacion es una accion de administrador: la base nace vacia y el
dataset se carga desde la aplicacion.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from ola.api.deps import AdminUser, SessionDep
from ola.api.schemas.imports import ImportRunOut
from ola.repositories import imports_repo
from ola.services import import_service

router = APIRouter(prefix="/api/imports", tags=["importacion"])

# El CSV completo de IMARPE pesa unos 3 MB; el margen cubre varios anos mas.
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
EXTENSIONES = (".csv", ".txt")


@router.post(
    "",
    response_model=ImportRunOut,
    status_code=status.HTTP_201_CREATED,
    summary="Importa el CSV de anomalias termicas",
)
def import_csv(
    session: SessionDep,
    admin: AdminUser,
    file: Annotated[UploadFile, File(description="CSV de ATSM publicado por IMARPE")],
) -> ImportRunOut:
    nombre = file.filename or "sin-nombre.csv"
    if not nombre.lower().endswith(EXTENSIONES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El archivo debe ser un CSV.",
        )
    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            # Codigo literal: la constante de Starlette quedo obsoleta.
            status_code=413,
            detail=f"El archivo supera el limite de {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    run = import_service.run_import(
        session, filename=nombre, stream=file.file, uploaded_by_id=admin.id
    )
    return ImportRunOut.from_run(run)


@router.get("", response_model=list[ImportRunOut], summary="Historial de importaciones")
def list_imports(session: SessionDep, admin: AdminUser, limit: int = 20) -> list[ImportRunOut]:
    return [ImportRunOut.from_run(run) for run in imports_repo.list_recent(session, limit=limit)]


@router.get("/{run_id}", response_model=ImportRunOut, summary="Detalle de una importacion")
def get_import(run_id: int, session: SessionDep, admin: AdminUser) -> ImportRunOut:
    run = imports_repo.get(session, run_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No existe esa importacion."
        )
    return ImportRunOut.from_run(run)
