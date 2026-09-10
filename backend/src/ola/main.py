"""Punto de entrada de la API de OLA."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from ola.api.routers import auth, health, imports, labs
from ola.config import Settings, get_settings
from ola.db.session import SessionLocal
from ola.services import auth_service

logger = logging.getLogger(__name__)


def _bootstrap_admin(settings: Settings) -> None:
    """Crea el administrador inicial definido en las variables de entorno.

    La base nace vacia y solo un administrador puede importar el dataset,
    asi que sin esta cuenta un despliegue limpio quedaria inutilizable.
    """
    try:
        with SessionLocal() as session:
            creado = auth_service.ensure_admin_exists(session, settings)
    except SQLAlchemyError:
        # Aun no se han aplicado las migraciones. No es motivo para impedir
        # que el proceso arranque: el healthcheck reportara el estado real.
        logger.warning("No se pudo crear el administrador inicial: la base no esta lista.")
        return
    if creado is not None:
        logger.info("Administrador inicial creado: %s", creado.email)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    _bootstrap_admin(get_settings())
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=settings.log_level)

    app = FastAPI(
        title="OLA — Observatorio Litoral de Anomalias termicas",
        description=(
            "API del sistema OLA. Clasifica y visualiza la anomalia de la "
            "temperatura superficial del mar publicada por IMARPE/PRODUCE."
        ),
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(labs.router)
    app.include_router(imports.router)
    return app


app = create_app()
