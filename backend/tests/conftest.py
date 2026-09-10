from __future__ import annotations

from collections.abc import Iterator
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from ola.api.deps import get_session
from ola.config import Settings, get_settings
from ola.db.models import Base, Laboratory, User, UserRole
from ola.main import create_app
from ola.security import create_access_token, hash_password
from ola.seeds.laboratories import LABORATORIES


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
    """Sesion sobre una base limpia: cada prueba parte del mismo estado.

    El catalogo de laboratorios se vuelve a sembrar despues de vaciar, porque
    en produccion lo carga una migracion y el resto del sistema lo da por
    existente: las mediciones no pueden importarse sin el.
    """
    tablas = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tablas} RESTART IDENTITY CASCADE"))

    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = factory()
    session.add_all(
        Laboratory(
            code=lab.code,
            name=lab.name,
            latitude=Decimal(lab.latitude),
            longitude=Decimal(lab.longitude),
        )
        for lab in LABORATORIES
    )
    session.commit()
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


FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_csv_path() -> Path:
    """Dataset reducido con casos de racha construidos a proposito.

    Ver tests/fixtures/generar_muestra.py para la tabla de casos.
    """
    return FIXTURES / "sample_atsm.csv"


@pytest.fixture
def sample_csv_bytes(sample_csv_path: Path) -> bytes:
    return sample_csv_path.read_bytes()


@pytest.fixture
def admin_user(db_session: Session) -> User:
    user = User(
        email="admin@ola.pe",
        password_hash=hash_password("miclave123"),
        full_name="Administrador",
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def normal_user(db_session: Session) -> User:
    user = User(
        email="pescador@ejemplo.pe",
        password_hash=hash_password("miclave123"),
        role=UserRole.USER,
    )
    db_session.add(user)
    db_session.commit()
    return user


def auth_headers(user: User) -> dict[str, str]:
    s = get_settings()
    token = create_access_token(
        str(user.id),
        secret=s.jwt_secret,
        algorithm=s.jwt_algorithm,
        expires_minutes=s.access_token_minutes,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user: User) -> dict[str, str]:
    return auth_headers(admin_user)


@pytest.fixture
def user_headers(normal_user: User) -> dict[str, str]:
    return auth_headers(normal_user)
