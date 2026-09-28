"""Un cambio de contrasena deja sin valor los tokens anteriores (RF-07)."""

from __future__ import annotations

from datetime import UTC, datetime

from ola.db.models import User
from ola.services.auth_service import token_revoked

CAMBIO = datetime(2026, 9, 27, 22, 0, 10, 700_000, tzinfo=UTC)


def usuario(cambio: datetime | None) -> User:
    return User(email="a@b.pe", password_hash="x", password_changed_at=cambio)


def test_sin_cambios_de_contrasena_todo_token_vale():
    assert not token_revoked({"iat": 0}, usuario(None))


def test_un_token_anterior_al_cambio_ya_no_vale():
    assert token_revoked({"iat": int(CAMBIO.timestamp()) - 1}, usuario(CAMBIO))


def test_el_token_emitido_en_el_mismo_segundo_del_cambio_vale():
    assert not token_revoked({"iat": int(CAMBIO.timestamp())}, usuario(CAMBIO))


def test_un_token_posterior_vale():
    assert not token_revoked({"iat": int(CAMBIO.timestamp()) + 60}, usuario(CAMBIO))


def test_un_token_sin_fecha_de_emision_no_vale_si_hubo_cambio():
    assert token_revoked({}, usuario(CAMBIO))
