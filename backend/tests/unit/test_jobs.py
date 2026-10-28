"""Programador de tareas (ola.jobs): cuando ejecuta cada tarea y como falla."""

from __future__ import annotations

import threading
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import pytest

from ola.jobs import IMPORT_LOCK_ID, SEND_LOCK_ID, Scheduler, Task, build_tasks, download
from ola.mail import RecordingMailer
from ola.services.channels import default_channels

INICIO = datetime(2026, 10, 27, 12, 0, tzinfo=UTC)


class Reloj:
    def __init__(self) -> None:
        self.ahora = INICIO

    def __call__(self) -> datetime:
        return self.ahora

    def avanzar(self, minutos: int) -> None:
        self.ahora += timedelta(minutes=minutos)


class Accion:
    """Tarea falsa que cuenta sus ejecuciones y puede fallar a proposito."""

    def __init__(self, error: Exception | None = None, al_ejecutar=None) -> None:
        self.veces = 0
        self._error = error
        self._al_ejecutar = al_ejecutar

    def __call__(self, _session: object) -> str:
        self.veces += 1
        if self._al_ejecutar is not None:
            self._al_ejecutar()
        if self._error is not None:
            raise self._error
        return "ok"


@contextmanager
def sesion_falsa() -> Iterator[object]:
    yield object()


def bloqueo(libre: bool = True, pedidos: list[int] | None = None):
    @contextmanager
    def _bloqueo(clave: int) -> Iterator[bool]:
        if pedidos is not None:
            pedidos.append(clave)
        yield libre

    return _bloqueo


def tarea(accion: Accion, nombre: str = "tarea", minutos: int = 10, clave: int = 1) -> Task:
    return Task(name=nombre, interval=timedelta(minutes=minutos), lock_id=clave, run=accion)


def programador(*tareas: Task, reloj: Reloj | None = None, lock=None) -> Scheduler:
    return Scheduler(tareas, sesion_falsa, lock or bloqueo(), clock=reloj or Reloj())


class TestTurnos:
    def test_la_primera_vuelta_ejecuta_todas_las_tareas(self):
        accion = Accion()
        assert programador(tarea(accion)).tick() == ["tarea"]
        assert accion.veces == 1

    def test_espera_su_intervalo_antes_de_repetir(self):
        reloj, accion = Reloj(), Accion()
        prog = programador(tarea(accion, minutos=10), reloj=reloj)

        prog.tick()
        reloj.avanzar(9)
        assert prog.tick() == []
        reloj.avanzar(1)
        assert prog.tick() == ["tarea"]
        assert accion.veces == 2

    def test_cada_tarea_lleva_su_propio_ritmo(self):
        reloj, rapida, lenta = Reloj(), Accion(), Accion()
        prog = programador(
            tarea(rapida, "rapida", minutos=5), tarea(lenta, "lenta", minutos=60), reloj=reloj
        )

        prog.tick()
        reloj.avanzar(5)
        assert prog.tick() == ["rapida"]
        assert (rapida.veces, lenta.veces) == (2, 1)


class TestBloqueo:
    def test_si_otra_instancia_la_esta_ejecutando_se_la_salta(self):
        accion = Accion()
        assert programador(tarea(accion), lock=bloqueo(libre=False)).tick() == []
        assert accion.veces == 0

    def test_cada_tarea_pide_su_propio_bloqueo(self):
        pedidos: list[int] = []
        prog = programador(
            tarea(Accion(), "a", clave=11),
            tarea(Accion(), "b", clave=22),
            lock=bloqueo(pedidos=pedidos),
        )
        prog.tick()
        assert pedidos == [11, 22]


class TestFallos:
    def test_un_fallo_no_detiene_las_demas_tareas(self):
        rota, sana = Accion(error=RuntimeError("SMTP caido")), Accion()
        prog = programador(tarea(rota, "rota"), tarea(sana, "sana"))

        assert prog.tick() == ["sana"]
        assert (rota.veces, sana.veces) == (1, 1)

    def test_la_tarea_que_fallo_se_reintenta_en_su_siguiente_turno(self):
        reloj, rota = Reloj(), Accion(error=RuntimeError("URL caida"))
        prog = programador(tarea(rota, minutos=10), reloj=reloj)

        prog.tick()
        reloj.avanzar(10)
        prog.tick()
        assert rota.veces == 2


class TestParada:
    def test_termina_la_vuelta_en_curso_y_se_detiene(self):
        parar = threading.Event()
        accion = Accion(al_ejecutar=parar.set)

        programador(tarea(accion)).run_forever(parar, tick_seconds=0)

        assert accion.veces == 1


class TestConfiguracion:
    def test_por_defecto_solo_envia_avisos_cada_diez_minutos(self, settings_factory):
        tareas = build_tasks(settings_factory(), channels=default_channels(RecordingMailer()))

        assert [(t.name, t.interval, t.lock_id) for t in tareas] == [
            ("enviar avisos pendientes", timedelta(minutes=10), SEND_LOCK_ID)
        ]

    def test_con_cero_minutos_no_envia_avisos(self, settings_factory):
        assert build_tasks(settings_factory(scheduler_send_minutes=0)) == []

    def test_la_importacion_automatica_solo_existe_con_una_url(self, settings_factory):
        ajustes = settings_factory(
            scheduler_send_minutes=0, import_url="https://datos.ejemplo.pe/atsm.csv"
        )
        tareas = build_tasks(ajustes)

        assert [(t.name, t.interval, t.lock_id) for t in tareas] == [
            ("importar desde la URL", timedelta(hours=24), IMPORT_LOCK_ID)
        ]


class TestDescarga:
    @pytest.mark.parametrize("url", ["file:///etc/passwd", "ftp://datos.ejemplo.pe/atsm.csv"])
    def test_solo_acepta_http_y_https(self, url):
        with pytest.raises(ValueError, match="http o https"):
            download(url)
