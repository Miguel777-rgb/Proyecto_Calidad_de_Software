"""Las migraciones de Alembic construyen el mismo esquema que los modelos.

En produccion la base la crean las migraciones al arrancar; en las pruebas,
los modelos. Si divergen, las pruebas pasan sobre un esquema que el VPS no
tiene. Se corre cada migracion en una base propia, vacia.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import Engine, create_engine, inspect, text

from ola.config import get_settings
from ola.db.models import Base

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"
BASE = "ola_migraciones"
ANTES_DE_RECUPERAR = "9c022526c786"


@pytest.fixture
def base_vacia(monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[Config, Engine]]:
    servidor = get_settings().database_url.rsplit("/", 1)[0]
    admin = create_engine(f"{servidor}/postgres", isolation_level="AUTOCOMMIT")
    with admin.connect() as conexion:
        conexion.execute(text(f"DROP DATABASE IF EXISTS {BASE} WITH (FORCE)"))
        conexion.execute(text(f"CREATE DATABASE {BASE}"))

    url = f"{servidor}/{BASE}"
    # env.py toma la URL de la configuracion, no del .ini.
    monkeypatch.setenv("OLA_DATABASE_URL", url)
    get_settings.cache_clear()
    configuracion = Config(str(ALEMBIC_INI))
    configuracion.set_main_option("script_location", str(ALEMBIC_INI.parent / "alembic"))
    motor = create_engine(url)
    try:
        yield configuracion, motor
    finally:
        motor.dispose()
        get_settings.cache_clear()
        with admin.connect() as conexion:
            conexion.execute(text(f"DROP DATABASE IF EXISTS {BASE} WITH (FORCE)"))
        admin.dispose()


def test_las_migraciones_producen_el_esquema_de_los_modelos(base_vacia):
    configuracion, motor = base_vacia

    command.upgrade(configuracion, "head")

    with motor.connect() as conexion:
        diferencias = compare_metadata(
            MigrationContext.configure(conexion, opts={"compare_type": True}), Base.metadata
        )
    assert diferencias == []


def test_la_recuperacion_de_contrasena_sube_y_baja(base_vacia):
    configuracion, motor = base_vacia

    command.upgrade(configuracion, "head")
    esquema = inspect(motor)
    assert "password_reset_codes" in esquema.get_table_names()
    assert "password_changed_at" in {c["name"] for c in esquema.get_columns("users")}

    command.downgrade(configuracion, ANTES_DE_RECUPERAR)
    esquema = inspect(motor)
    assert "password_reset_codes" not in esquema.get_table_names()
    assert "password_changed_at" not in {c["name"] for c in esquema.get_columns("users")}

    command.upgrade(configuracion, "head")
    assert "password_reset_codes" in inspect(motor).get_table_names()
