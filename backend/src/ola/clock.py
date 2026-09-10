"""Abstraccion del tiempo.

El estado termico de una zona NO se mide contra el reloj del servidor sino
contra la fecha del dato mas reciente en la base (ver services/status_service).
Este reloj solo sella eventos de auditoria: cuando se ejecuto una importacion,
cuando se detecto una alerta, cuando se envio un correo.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Protocol


class Clock(Protocol):
    def now(self) -> datetime: ...


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


class FixedClock:
    """Reloj congelado, para que las pruebas sean deterministas."""

    def __init__(self, moment: datetime) -> None:
        self._moment = moment

    def now(self) -> datetime:
        return self._moment
