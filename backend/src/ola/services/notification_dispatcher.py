"""Envio de los avisos pendientes (RF-03).

El despachador decide QUE se envia y que pasa cuando falla. No sabe de
SQLAlchemy, de SMTP ni del reloj del sistema: recibe un almacen, los canales
y un reloj. Por eso se prueba con dobles en memoria, sin base de datos.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from ola.clock import Clock
from ola.domain.notices import NotificationChannel, OutboundNotice
from ola.services.channels import ChannelRegistry

# La columna `error` es de texto libre, pero un volcado de pila no ayuda a
# quien revisa los fallos desde la aplicacion.
MAX_ERROR_LENGTH = 500


class NotificationStore(Protocol):
    def pending(
        self, channels: Sequence[NotificationChannel], *, limit: int
    ) -> list[OutboundNotice]:
        """Avisos por entregar de esos canales, incluidos los que fallaron antes."""
        ...

    def mark_sent(self, notice_id: int, at: datetime) -> None: ...

    def mark_failed(self, notice_id: int, reason: str) -> None: ...


@dataclass(frozen=True)
class SendSummary:
    attempted: int
    sent: int
    failed: int


class NotificationDispatcher:
    def __init__(self, store: NotificationStore, channels: ChannelRegistry, clock: Clock) -> None:
        self._store = store
        self._channels = channels
        self._clock = clock

    def send_pending(self, *, limit: int = 200) -> SendSummary:
        """Entrega los avisos pendientes y los que fallaron en un intento anterior.

        Un fallo no detiene la tanda ni pierde el aviso: queda marcado con su
        motivo para que el administrador pueda reintentar.
        """
        codigos = [canal.code for canal in self._channels.dispatchable()]
        pendientes = self._store.pending(codigos, limit=limit)
        enviados = fallidos = 0

        for aviso in pendientes:
            try:
                self._channels.get(aviso.channel).deliver(aviso)
            except Exception as exc:
                self._store.mark_failed(aviso.id, str(exc)[:MAX_ERROR_LENGTH])
                fallidos += 1
            else:
                self._store.mark_sent(aviso.id, self._clock.now())
                enviados += 1

        return SendSummary(attempted=len(pendientes), sent=enviados, failed=fallidos)
