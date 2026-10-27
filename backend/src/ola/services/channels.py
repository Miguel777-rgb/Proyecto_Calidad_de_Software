"""Canales de entrega de los avisos (RF-03).

Cada canal sabe entregar un aviso y nada mas. Quien envia (el despachador)
solo conoce el contrato `Channel`, asi que un canal nuevo se anade
escribiendo una clase y registrandola en `default_channels`, sin modificar
el envio, el repositorio ni los routers.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol

from ola.domain.notices import NotificationChannel, OutboundNotice
from ola.mail import Email, Mailer


class Channel(Protocol):
    @property
    def code(self) -> NotificationChannel: ...

    @property
    def requires_dispatch(self) -> bool:
        """Falso en los canales de consulta, donde el aviso guardado ya es la entrega."""
        ...

    def deliver(self, notice: OutboundNotice) -> None:
        """Entrega el aviso. Lanza una excepcion si falla; quien llama la registra."""
        ...


class EmailChannel:
    code = NotificationChannel.EMAIL
    requires_dispatch = True

    def __init__(self, mailer: Mailer) -> None:
        self._mailer = mailer

    def deliver(self, notice: OutboundNotice) -> None:
        self._mailer.send(
            Email(
                to=notice.recipient.email,
                subject=notice.message.subject,
                body=notice.message.body,
            )
        )


class InAppChannel:
    """El aviso se lee desde la aplicacion: no hay nada que empujar."""

    code = NotificationChannel.IN_APP
    requires_dispatch = False

    def deliver(self, notice: OutboundNotice) -> None:
        return None


class DuplicateChannelError(ValueError):
    def __init__(self, code: NotificationChannel) -> None:
        super().__init__(f"El canal '{code.value}' esta registrado mas de una vez.")


class UnknownChannelError(LookupError):
    def __init__(self, code: NotificationChannel) -> None:
        super().__init__(f"No hay ningun canal registrado para '{code.value}'.")


class ChannelRegistry:
    """Los canales disponibles, indexados por su codigo."""

    def __init__(self, channels: Iterable[Channel]) -> None:
        self._by_code: dict[NotificationChannel, Channel] = {}
        for channel in channels:
            if channel.code in self._by_code:
                raise DuplicateChannelError(channel.code)
            self._by_code[channel.code] = channel

    def codes(self) -> tuple[NotificationChannel, ...]:
        return tuple(self._by_code)

    def dispatchable(self) -> tuple[Channel, ...]:
        return tuple(c for c in self._by_code.values() if c.requires_dispatch)

    def get(self, code: NotificationChannel) -> Channel:
        try:
            return self._by_code[code]
        except KeyError:
            raise UnknownChannelError(code) from None


def default_channels(mailer: Mailer) -> ChannelRegistry:
    """Punto unico donde se decide que canales tiene el sistema."""
    return ChannelRegistry([EmailChannel(mailer), InAppChannel()])
