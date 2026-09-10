"""El reloj congelado es lo que hace deterministas las pruebas de auditoria."""

from __future__ import annotations

from datetime import UTC, datetime

from ola.clock import FixedClock, SystemClock


def test_fixed_clock_devuelve_siempre_el_mismo_instante():
    momento = datetime(2026, 7, 31, 12, 0, tzinfo=UTC)
    reloj = FixedClock(momento)
    assert reloj.now() == momento
    assert reloj.now() == momento


def test_system_clock_devuelve_hora_con_zona_utc():
    ahora = SystemClock().now()
    assert ahora.tzinfo is not None
    assert ahora.utcoffset().total_seconds() == 0
