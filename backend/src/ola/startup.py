"""Preparacion del arranque en produccion.

Aplica las migraciones pendientes antes de que la aplicacion empiece a
atender peticiones. Se protege con un bloqueo de PostgreSQL para que dos
replicas arrancando a la vez no intenten migrar simultaneamente: la segunda
espera y encuentra la base ya al dia.
"""

from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from ola.config import get_settings
from ola.observability import configure_logging

logger = logging.getLogger(__name__)

# Identificador arbitrario pero fijo del bloqueo. Cualquier proceso que use
# el mismo numero se serializa con los demas.
MIGRATION_LOCK_ID = 20260910

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"


def run_migrations() -> None:
    settings = get_settings()
    engine = create_engine(settings.database_url, isolation_level="AUTOCOMMIT")

    with engine.connect() as conexion:
        logger.info("Esperando el bloqueo de migraciones...")
        conexion.execute(text("SELECT pg_advisory_lock(:clave)"), {"clave": MIGRATION_LOCK_ID})
        try:
            configuracion = Config(str(ALEMBIC_INI))
            configuracion.set_main_option("script_location", str(ALEMBIC_INI.parent / "alembic"))
            command.upgrade(configuracion, "head")
            logger.info("Migraciones al dia.")
        finally:
            conexion.execute(
                text("SELECT pg_advisory_unlock(:clave)"), {"clave": MIGRATION_LOCK_ID}
            )
    engine.dispose()


def main() -> None:
    configure_logging(get_settings())
    run_migrations()


if __name__ == "__main__":
    main()
