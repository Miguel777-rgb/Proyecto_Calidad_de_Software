"""Vigencia del dato de una zona (RF-04, atributo de Confiabilidad)."""

from __future__ import annotations

from datetime import date


def is_stale(last_measured_on: date | None, *, reference_date: date, window_days: int) -> bool:
    """Indica si una zona lleva demasiado tiempo sin mediciones.

    La comparacion es contra la fecha del dato mas reciente de TODO el sistema,
    no contra el reloj del servidor: IMARPE publica con retraso y usar la hora
    real dejaria todas las zonas marcadas como obsoletas.

    Asi, MATARANI (cuya serie termina en 2016) queda marcada sin necesidad de
    nombrarla en el codigo, y una zona al dia no parpadea por un retraso normal.
    """
    if last_measured_on is None:
        return True
    return (reference_date - last_measured_on).days > window_days
