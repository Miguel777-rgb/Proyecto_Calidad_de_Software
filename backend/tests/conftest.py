from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from ola.api.deps import get_session
from ola.config import Settings, get_settings
from ola.db.models import Base
from ola.main import create_app


@pytest.fixture
def settings_factory():
    """Crea Settings ignorando el archivo .env real del equipo.

    Sin esto las pruebas dependerian de la maquina donde se ejecutan.
    """

    def _make(**overrides: object) -> Settings:
        return Settings(_env_file=None, **overrides)  # type: ignore[arg-type]

    return _make


def _test_database_url() -> str:
    """Deriva la URL de la base de pruebas de la de desarrollo.

    Las pruebas nunca deben escribir en la base de desarrollo: perderian los
    datos importados y dejarian de ser reproducibles.
    """
    base = get_settings().database_url
    return base.rsplit("/", 1)[0] + "/ola_test"


@pytest.fixture(scope="session")
def engine():
    url = _test_database_url()
    admin_url = url.rsplit("/", 1)[0] + "/postgres"

    # CREATE DATABASE no puede ejecutarse dentro de una transaccion.
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        existe = conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = 'ola_test'"))
        if not existe:
            conn.execute(text("CREATE DATABASE ola_test"))
    admin_engine.dispose()

    test_engine = create_engine(url)
    Base.metadata.create_all(test_engine)
    yield test_engine
    test_engine.dispose()


@pytest.fixture
def db_session(engine) -> Iterator[Session]:
    """Sesion sobre una base vacia: cada prueba parte del mismo estado."""
    tablas = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tablas} RESTART IDENTITY CASCADE"))

    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    """Cliente HTTP cuya API usa la base de pruebas.

    Se instancia TestClient sin `with` a proposito: asi no se ejecuta el
    lifespan, que crearia el administrador en la base de DESARROLLO. El
    arranque se prueba aparte, en test_auth_service.py.
    """
    app = create_app()
    app.dependency_overrides[get_session] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()
