"""Limite de intentos por clave (ola.ratelimit)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from ola import ratelimit
from ola.ratelimit import AttemptLimiter, AuthLimiters


class RelojMovil:
    def __init__(self) -> None:
        self.ahora = datetime(2026, 10, 27, 12, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self.ahora

    def avanzar(self, minutos: float) -> None:
        self.ahora += timedelta(minutes=minutos)


@pytest.fixture
def reloj() -> RelojMovil:
    return RelojMovil()


def limitador(reloj: RelojMovil, maximo: int = 3, minutos: int = 15) -> AttemptLimiter:
    return AttemptLimiter(maximo, timedelta(minutes=minutos), reloj)


class TestBloqueo:
    def test_por_debajo_del_maximo_deja_intentar(self, reloj):
        limite = limitador(reloj)
        limite.record("ana")
        limite.record("ana")
        assert limite.retry_after("ana") is None

    def test_al_llegar_al_maximo_bloquea_toda_la_ventana(self, reloj):
        limite = limitador(reloj)
        for _ in range(3):
            limite.record("ana")
        assert limite.retry_after("ana") == 15 * 60

    def test_la_espera_cuenta_hasta_que_sale_el_intento_mas_antiguo(self, reloj):
        limite = limitador(reloj)
        for _ in range(3):
            limite.record("ana")
            reloj.avanzar(5)
        # Intentos a los 0, 5 y 10 minutos; ahora son los 15: el primero sale ya.
        assert limite.retry_after("ana") is None

        limite.record("ana")
        assert limite.retry_after("ana") == 5 * 60

    def test_cada_clave_cuenta_aparte(self, reloj):
        limite = limitador(reloj)
        for _ in range(3):
            limite.record("ana")
        assert limite.retry_after("beto") is None

    def test_reiniciar_borra_los_intentos(self, reloj):
        limite = limitador(reloj)
        for _ in range(3):
            limite.record("ana")
        limite.reset("ana")
        assert limite.retry_after("ana") is None


class TestMemoria:
    def test_barre_las_claves_vencidas_al_superar_el_tope(self, reloj, monkeypatch):
        monkeypatch.setattr(ratelimit, "MAX_KEYS_BEFORE_SWEEP", 2)
        limite = limitador(reloj)
        limite.record("a@x.pe")
        limite.record("b@x.pe")
        reloj.avanzar(16)

        limite.record("c@x.pe")

        assert set(limite._intentos) == {"c@x.pe"}


class TestLimitesDeAutenticacion:
    def test_toma_los_maximos_de_la_configuracion(self, settings_factory, reloj):
        ajustes = settings_factory(login_failures_per_account=2, rate_limit_window_minutes=1)
        limites = AuthLimiters.from_settings(ajustes, clock=reloj)

        limites.login_per_account.record("ana")
        limites.login_per_account.record("ana")

        assert limites.login_per_account.retry_after("ana") == 60
        assert limites.login_per_ip.retry_after("ana") is None
