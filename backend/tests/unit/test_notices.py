"""Conceptos de los avisos (RF-03): que se registra y que texto lleva."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from ola.domain.notices import (
    COMPOSERS,
    AlertFacts,
    NotificationChannel,
    NotificationKind,
    compose,
    plan_rows,
)

HECHOS = AlertFacts(
    zona="Callao",
    state="warm",
    started_on=date(2026, 7, 24),
    ended_on=date(2026, 7, 31),
    streak_length=8,
    peak_anomaly_c=Decimal("1.9234"),
)


class TestPlanDeAvisos:
    def test_un_aviso_por_cada_canal(self):
        filas = plan_rows([(7, 1)], NotificationKind.OPENED, tuple(NotificationChannel))
        assert {f.channel for f in filas} == set(NotificationChannel)

    def test_un_aviso_por_cada_suscrito(self):
        filas = plan_rows(
            [(7, 1), (7, 2), (7, 3)], NotificationKind.OPENED, [NotificationChannel.EMAIL]
        )
        assert [f.user_id for f in filas] == [1, 2, 3]

    def test_conserva_el_episodio_y_el_momento(self):
        (fila,) = plan_rows([(7, 1)], NotificationKind.CLOSED, [NotificationChannel.IN_APP])
        assert (fila.alert_event_id, fila.kind) == (7, NotificationKind.CLOSED)

    def test_sin_suscritos_no_hay_nada_que_registrar(self):
        assert plan_rows([], NotificationKind.OPENED, tuple(NotificationChannel)) == []

    def test_sin_canales_no_hay_nada_que_registrar(self):
        assert plan_rows([(7, 1)], NotificationKind.OPENED, []) == []


class TestTextoDelAviso:
    def test_el_aviso_de_inicio_nombra_la_zona_y_el_estado(self):
        mensaje = compose(NotificationKind.OPENED, HECHOS)
        assert "Callao" in mensaje.subject
        assert "cálida" in mensaje.subject

    def test_el_aviso_de_fin_dice_que_termino(self):
        mensaje = compose(NotificationKind.CLOSED, HECHOS)
        assert "terminó" in mensaje.subject

    @pytest.mark.parametrize("tipo", list(NotificationKind))
    def test_todos_los_momentos_tienen_texto(self, tipo):
        # Si se anade un momento nuevo y se olvida su texto, falla aqui y no
        # al enviar el primer aviso en produccion.
        assert tipo in COMPOSERS
        assert compose(tipo, HECHOS).body
