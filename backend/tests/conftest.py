from __future__ import annotations

import pytest

from ola.config import Settings


@pytest.fixture
def settings_factory():
    """Crea Settings ignorando el archivo .env real del equipo.

    Sin esto las pruebas dependerian de la maquina donde se ejecutan.
    """

    def _make(**overrides: object) -> Settings:
        return Settings(_env_file=None, **overrides)  # type: ignore[arg-type]

    return _make
