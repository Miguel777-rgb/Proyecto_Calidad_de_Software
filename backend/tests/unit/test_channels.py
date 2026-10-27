"""Canales de entrega de los avisos (RF-03)."""

from __future__ import annotations

import pytest

from ola.domain.messages import AlertMessage
from ola.domain.notices import NotificationChannel, OutboundNotice, Recipient
from ola.mail import RecordingMailer
from ola.services.channels import (
    ChannelRegistry,
    DuplicateChannelError,
    EmailChannel,
    InAppChannel,
    UnknownChannelError,
    default_channels,
)


def aviso(canal: NotificationChannel = NotificationChannel.EMAIL) -> OutboundNotice:
    return OutboundNotice(
        id=1,
        channel=canal,
        recipient=Recipient(user_id=9, email="pescador@ejemplo.pe"),
        message=AlertMessage(subject="OLA: alerta cálida en Callao", body="El mar..."),
    )


class TestCanalDeCorreo:
    def test_entrega_al_correo_del_destinatario(self):
        buzon = RecordingMailer()
        EmailChannel(buzon).deliver(aviso())
        assert buzon.sent[0].to == "pescador@ejemplo.pe"

    def test_lleva_el_asunto_y_el_cuerpo_del_aviso(self):
        buzon = RecordingMailer()
        EmailChannel(buzon).deliver(aviso())
        assert buzon.sent[0].subject == "OLA: alerta cálida en Callao"
        assert buzon.sent[0].body == "El mar..."

    def test_propaga_el_fallo_del_servidor(self):
        canal = EmailChannel(RecordingMailer(fail_with=OSError("caido")))
        with pytest.raises(OSError, match="caido"):
            canal.deliver(aviso())


class TestCanalEnLaAplicacion:
    def test_no_requiere_envio(self):
        assert InAppChannel().requires_dispatch is False

    def test_entregar_no_hace_nada(self):
        assert InAppChannel().deliver(aviso(NotificationChannel.IN_APP)) is None


class TestRegistro:
    def test_los_canales_por_defecto_cubren_todos_los_que_se_guardan(self):
        # Un canal que se guarda pero que nadie sabe entregar dejaria avisos
        # pendientes para siempre.
        assert set(default_channels(RecordingMailer()).codes()) == set(NotificationChannel)

    def test_solo_el_correo_requiere_envio(self):
        canales = default_channels(RecordingMailer()).dispatchable()
        assert [c.code for c in canales] == [NotificationChannel.EMAIL]

    def test_rechaza_un_canal_repetido(self):
        with pytest.raises(DuplicateChannelError):
            ChannelRegistry([InAppChannel(), InAppChannel()])

    def test_pedir_un_canal_no_registrado_es_un_error(self):
        with pytest.raises(UnknownChannelError):
            ChannelRegistry([InAppChannel()]).get(NotificationChannel.EMAIL)
