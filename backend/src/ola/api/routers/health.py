"""Endpoints de salud, usados por Docker, Dokploy y las pruebas E2E."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ola.db.session import get_session

router = APIRouter(prefix="/api/health", tags=["salud"])


@router.get("", summary="Comprueba que el proceso responde")
def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", summary="Comprueba que la base de datos responde")
def readiness(session: Annotated[Session, Depends(get_session)]) -> JSONResponse:
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "database": "error", "detail": str(exc)},
        )
    return JSONResponse(status_code=200, content={"status": "ok", "database": "ok"})
