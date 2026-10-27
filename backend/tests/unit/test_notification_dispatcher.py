"""Envio de los avisos pendientes (RF-03), sin base de datos ni servidor de correo.

El almacen y el canal son dobles en memoria y el reloj esta congelado, de
modo que cada prueba fija por completo la situacion que comprueba.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from ola.clock import FixedClock
from ola.domain.messages import AlertMessage
from ola.domain.notices import NotificationChannel, OutboundNotice, Recipient
from ola.mail import RecordingMailer
from ola.services.channels import ChannelRegistry, EmailChannel, InAppChannel
from ola.services.notification_dispatcher import (
    MAX_ERROR_LENGTH,
    NotificationDispatcher,
)

AHORA = datetime(2026, 8, 1, 6, 30, tzinfo=UTC)


def aviso(identificador: int, canal: NotificationChannel = NotificationChannel.EMAIL):
    return OutboundNotice(
        id=identificador,
        channel=canal,
        recipient=Recipient(user_id=identificador, email=f"usuario{identificador}@ejemplo.pe"),
        message=AlertMessage(subject=f"Aviso {identificador}", body="..."),
    )


class AlmacenEnMemoria:
    def __init__(self, avisos: Sequence[OutboundNotice]) -> None:
        self._avisos = list(avisos)
        self.enviados: dict[int, datetime] = {}
        self.fallidos: dict[int, str] = {}
        self.limite_pedido: int | None = None

    def pending(self, channels, *, limit):
        self.limite_pedido = limit
        por_enviar = [
            a for a in self._avisos if a.channel in channels and a.id not in self.enviados
        ]
        return por_enviar[:limit]

    def mark_sent(self, notice_id, at):
        self.enviados[notice_id] = at
        self.fallidos.pop(notice_id, None)

    def mark_failed(self, notice_id, reason):
        self.fallidos[notice_id] = reason


class CanalQueFallaCon:
    """Canal de correo que falla para los avisos indicados."""

    code = NotificationChannel.EMAIL
    requires_dispatch = True

    def __init__(self, ids_que_fallan: set[int], motivo: str = "servidor no disponible") -> None:
        self._ids = ids_que_fallan
        self._motivo = motivo
        self.entregados: list[int] = []

    def deliver(self, notice):
        if notice.id in self._ids:
            raise OSError(self._motivo)
        self.entregados.append(notice.id)


def despachador(almacen, canales):
    return NotificationDispatcher(almacen, ChannelRegistry(canales), FixedClock(AHORA))


class TestEnvio:
    def test_entrega_cada_aviso_pendiente(self):
        buzon = RecordingMailer()
        almacen = AlmacenEnMemoria([aviso(1), aviso(2)])

        resumen = despachador(almacen, [EmailChannel(buzon)]).send_pending()

        assert (resumen.attempted, resumen.sent, resumen.failed) == (2, 2, 0)
        assert [c.to for c in buzon.sent] == ["usuario1@ejemplo.pe", "usuario2@ejemplo.pe"]

    def test_sella_el_envio_con_la_hora_del_reloj_recibido(self):
        almacen = AlmacenEnMemoria([aviso(1)])
        despachador(almacen, [EmailChannel(RecordingMailer())]).send_pending()
        assert almacen.enviados == {1: AHORA}

    def test_sin_pendientes_no_intenta_nada(self):
        resumen = despachador(
            AlmacenEnMemoria([]), [EmailChannel(RecordingMailer())]
        ).send_pending()
        assert resumen.attempted == 0

    def test_no_reenvia_lo_ya_enviado(self):
        buzon = RecordingMailer()
        d = despachador(AlmacenEnMemoria([aviso(1)]), [EmailChannel(buzon)])
        d.send_pending()
        segundo = d.send_pending()
        assert segundo.attempted == 0
        assert len(buzon.sent) == 1

    def test_respeta_el_limite_de_la_tanda(self):
        almacen = AlmacenEnMemoria([aviso(i) for i in range(1, 6)])
        resumen = despachador(almacen, [EmailChannel(RecordingMailer())]).send_pending(limit=2)
        assert almacen.limite_pedido == 2
        assert resumen.attempted == 2


class TestCanales:
    def test_los_canales_de_consulta_no_se_despachan(self):
        buzon = RecordingMailer()
        almacen = AlmacenEnMemoria([aviso(1), aviso(2, NotificationChannel.IN_APP)])

        resumen = despachador(almacen, [EmailChannel(buzon), InAppChannel()]).send_pending()

        assert resumen.attempted == 1
        assert 2 not in almacen.enviados

    def test_acepta_cualquier_canal_que_cumpla_el_contrato(self):
        # Sustituir el canal no exige tocar el despachador.
        canal = CanalQueFallaCon(set())
        despachador(AlmacenEnMemoria([aviso(1)]), [canal]).send_pending()
        assert canal.entregados == [1]


class TestFallos:
    def test_un_fallo_se_registra_con_su_motivo(self):
        almacen = AlmacenEnMemoria([aviso(1)])
        resumen = despachador(almacen, [CanalQueFallaCon({1})]).send_pending()
        assert resumen.failed == 1
        assert almacen.fallidos == {1: "servidor no disponible"}

    def test_un_fallo_no_detiene_los_demas_envios(self):
        almacen = AlmacenEnMemoria([aviso(1), aviso(2), aviso(3)])
        canal = CanalQueFallaCon({2})

        resumen = despachador(almacen, [canal]).send_pending()

        assert (resumen.sent, resumen.failed) == (2, 1)
        assert canal.entregados == [1, 3]

    def test_un_aviso_fallido_no_queda_marcado_como_enviado(self):
        almacen = AlmacenEnMemoria([aviso(1)])
        despachador(almacen, [CanalQueFallaCon({1})]).send_pending()
        assert almacen.enviados == {}

    def test_el_motivo_se_recorta_para_no_guardar_un_volcado(self):
        almacen = AlmacenEnMemoria([aviso(1)])
        despachador(almacen, [CanalQueFallaCon({1}, motivo="x" * 2000)]).send_pending()
        assert len(almacen.fallidos[1]) == MAX_ERROR_LENGTH

    def test_un_aviso_fallido_se_reintenta_en_el_siguiente_envio(self):
        almacen = AlmacenEnMemoria([aviso(1)])
        despachador(almacen, [CanalQueFallaCon({1})]).send_pending()

        buzon = RecordingMailer()
        resumen = despachador(almacen, [EmailChannel(buzon)]).send_pending()

        assert resumen.sent == 1
        assert almacen.fallidos == {}
