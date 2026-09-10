"""Vigencia del dato por zona (RF-04)."""

from __future__ import annotations

from datetime import date

import pytest

from ola.domain.freshness import is_stale

REF = date(2026, 7, 31)


@pytest.mark.parametrize("dias", [0, 1, 5, 7])
def test_dentro_de_la_ventana_el_dato_esta_vigente(dias):
    ultimo = date.fromordinal(REF.toordinal() - dias)
    assert is_stale(ultimo, reference_date=REF, window_days=7) is False


@pytest.mark.parametrize("dias", [8, 15, 100])
def test_pasada_la_ventana_el_dato_queda_obsoleto(dias):
    ultimo = date.fromordinal(REF.toordinal() - dias)
    assert is_stale(ultimo, reference_date=REF, window_days=7) is True


def test_el_limite_exacto_de_la_ventana_sigue_vigente():
    # Con 7 dias de ventana, 7 dias de antiguedad aun cuenta como reciente.
    assert is_stale(date(2026, 7, 24), reference_date=REF, window_days=7) is False
    assert is_stale(date(2026, 7, 23), reference_date=REF, window_days=7) is True


def test_una_zona_sin_mediciones_esta_obsoleta():
    assert is_stale(None, reference_date=REF, window_days=7) is True


def test_matarani_queda_obsoleta_sin_nombrarla_en_el_codigo():
    # Su serie termina en 2016; la obsolescencia se deduce del dato.
    assert is_stale(date(2016, 12, 31), reference_date=REF, window_days=7) is True
