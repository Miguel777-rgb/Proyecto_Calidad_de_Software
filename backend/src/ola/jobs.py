"""Tareas programadas: envio de avisos pendientes e importacion opcional.

Corre como un proceso aparte (servicio ``scheduler`` de compose), no dentro de
la API: en produccion la API arranca con dos workers de uvicorn y cada uno
repetiria las tareas. Cada ejecucion toma ademas un bloqueo de PostgreSQL, asi
que dos programadores levantados por error tampoco se pisan.

Uso::

    python -m ola.jobs scheduler      # bucle: ejecuta cada tarea cuando le toca
    python -m ola.jobs send-notices   # una vez: envia los avisos pendientes
    python -m ola.jobs import-url     # una vez: importa el CSV de OLA_IMPORT_URL
"""

from __future__ import annotations

import argparse
import hashlib
import io
import logging
import signal
import threading
from collections.abc import Callable, Iterator, Sequence
from contextlib import AbstractContextManager, contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse
from urllib.request import urlopen

from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from ola.config import Settings, get_settings
from ola.db.models import ImportRun, ImportStatus
from ola.mail import SmtpMailer
from ola.repositories import imports_repo
from ola.services import import_service, notification_service, refresh_service, settings_service
from ola.services.channels import ChannelRegistry, default_channels
from ola.services.notification_dispatcher import SendSummary

logger = logging.getLogger(__name__)

# Bloqueos de PostgreSQL de cada tarea; distintos del de migraciones (startup.py).
SEND_LOCK_ID = 20261027
IMPORT_LOCK_ID = 20261028

# El mismo limite que la importacion manual (routers/imports.py).
MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024
DOWNLOAD_TIMEOUT_SECONDS = 60
TICK_SECONDS = 30.0

Fetch = Callable[[str], bytes]
SessionFactory = Callable[[], Session]
LockFactory = Callable[[int], AbstractContextManager[bool]]


# --- Tareas ------------------------------------------------------------------


def send_pending_notices(session: Session, channels: ChannelRegistry) -> SendSummary:
    """Envia los avisos pendientes y reintenta los fallidos (RF-03)."""
    return notification_service.dispatch_pending(session, channels)


def download(url: str) -> bytes:
    """Descarga el CSV con limite de tamano y de tiempo. Solo http y https."""
    if urlparse(url).scheme not in ("http", "https"):
        raise ValueError(f"La URL de importacion debe ser http o https: {url!r}")
    with urlopen(url, timeout=DOWNLOAD_TIMEOUT_SECONDS) as respuesta:
        datos: bytes = respuesta.read(MAX_DOWNLOAD_BYTES + 1)
    if len(datos) > MAX_DOWNLOAD_BYTES:
        raise ValueError(f"El archivo supera el limite de {MAX_DOWNLOAD_BYTES // 2**20} MB.")
    return datos


def import_from_url(
    session: Session, settings: Settings, url: str, fetch: Fetch = download
) -> ImportRun | None:
    """Importa el CSV publicado en ``url`` y reevalua si cambio alguna medicion.

    Devuelve None si el archivo es identico al de la ultima importacion
    completada: asi el historial no se llena con una importacion igual por dia.
    """
    datos = fetch(url)
    huella = hashlib.sha256(datos).hexdigest()
    recientes = imports_repo.list_recent(session, limit=1)
    ultima = recientes[0] if recientes else None
    if ultima is not None and ultima.sha256 == huella and ultima.status == ImportStatus.COMPLETED:
        logger.info("La fuente no cambio desde la ultima importacion (%s).", huella[:12])
        return None

    nombre = urlparse(url).path.rsplit("/", 1)[-1] or "importacion-automatica.csv"
    run = import_service.run_import(
        session, filename=nombre, stream=io.BytesIO(datos), uploaded_by_id=None
    )
    if refresh_service.import_changed_readings(run):
        config = settings_service.get_effective(session, settings)
        refresh_service.refresh_alerts(session, config)
    return run


# --- Programador -------------------------------------------------------------


@dataclass
class Task:
    name: str
    interval: timedelta
    lock_id: int
    run: Callable[[Session], object]
    last_started: datetime | None = None

    def is_due(self, now: datetime) -> bool:
        return self.last_started is None or now - self.last_started >= self.interval


@contextmanager
def advisory_lock(engine: Engine, lock_id: int) -> Iterator[bool]:
    """Bloqueo que no espera: si otro proceso tiene la tarea, se salta esta vuelta.

    Es de transaccion, asi que PostgreSQL lo suelta solo al cerrarse la
    conexion aunque la tarea termine con una excepcion.
    """
    with engine.connect() as conexion:
        consulta = text("SELECT pg_try_advisory_xact_lock(:clave)")
        yield bool(conexion.execute(consulta, {"clave": lock_id}).scalar())


class Scheduler:
    def __init__(
        self,
        tasks: Sequence[Task],
        session_factory: SessionFactory,
        lock: LockFactory,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._tasks = list(tasks)
        self._session_factory = session_factory
        self._lock = lock
        self._clock = clock

    def tick(self) -> list[str]:
        """Ejecuta las tareas a las que les toca y devuelve las que terminaron bien."""
        ahora = self._clock()
        terminadas: list[str] = []
        for tarea in self._tasks:
            if not tarea.is_due(ahora):
                continue
            tarea.last_started = ahora
            with self._lock(tarea.lock_id) as obtenido:
                if not obtenido:
                    logger.info("Otra instancia ejecuta '%s'; se salta esta vuelta.", tarea.name)
                    continue
                try:
                    with self._session_factory() as session:
                        resultado = tarea.run(session)
                except Exception:
                    # Un SMTP caido o una URL que no responde no detienen al
                    # programador: la tarea se reintenta en su siguiente turno.
                    logger.exception("La tarea '%s' fallo", tarea.name)
                    continue
            logger.info("Tarea '%s' terminada: %s", tarea.name, resultado)
            terminadas.append(tarea.name)
        return terminadas

    def run_forever(self, stop: threading.Event, tick_seconds: float = TICK_SECONDS) -> None:
        """Repite tick() hasta que ``stop`` se active; la tarea en curso termina antes."""
        while not stop.is_set():
            self.tick()
            stop.wait(tick_seconds)


def build_tasks(
    settings: Settings, channels: ChannelRegistry | None = None, fetch: Fetch = download
) -> list[Task]:
    tareas: list[Task] = []
    if settings.scheduler_send_minutes > 0:
        canales = channels if channels is not None else default_channels(SmtpMailer(settings))
        tareas.append(
            Task(
                name="enviar avisos pendientes",
                interval=timedelta(minutes=settings.scheduler_send_minutes),
                lock_id=SEND_LOCK_ID,
                run=lambda session: send_pending_notices(session, canales),
            )
        )
    if settings.import_url:
        url = settings.import_url
        tareas.append(
            Task(
                name="importar desde la URL",
                interval=timedelta(hours=settings.import_every_hours),
                lock_id=IMPORT_LOCK_ID,
                run=lambda session: import_from_url(session, settings, url, fetch),
            )
        )
    return tareas


# --- Linea de comandos -------------------------------------------------------


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m ola.jobs", description=__doc__)
    comandos = parser.add_subparsers(dest="command", required=True)
    comandos.add_parser("scheduler", help="Ejecuta cada tarea cuando le toca, sin terminar.")
    comandos.add_parser("send-notices", help="Envia una vez los avisos pendientes.")
    importar = comandos.add_parser("import-url", help="Importa una vez el CSV de la URL.")
    importar.add_argument("--url", help="URL del CSV; por defecto, OLA_IMPORT_URL.")
    args = parser.parse_args(argv)

    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    # Import diferido: el modulo crea el motor de la base al importarse.
    from ola.db.session import SessionLocal, engine

    if args.command == "send-notices":
        with SessionLocal() as session:
            print(send_pending_notices(session, default_channels(SmtpMailer(settings))))
        return 0

    if args.command == "import-url":
        url = args.url or settings.import_url
        if not url:
            parser.error("falta la URL: usa --url o define OLA_IMPORT_URL")
        with SessionLocal() as session:
            run = import_from_url(session, settings, url)
        print("Sin cambios desde la ultima importacion." if run is None else run)
        return 0

    tareas = build_tasks(settings)
    if not tareas:
        logger.warning("No hay tareas activas: revisa OLA_SCHEDULER_SEND_MINUTES y OLA_IMPORT_URL.")
    for tarea in tareas:
        logger.info("Tarea '%s' cada %s.", tarea.name, tarea.interval)

    # Docker detiene el contenedor con SIGTERM: se termina la tarea en curso
    # en vez de cortar un envio a la mitad, que dejaria correos sin registrar.
    parar = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: parar.set())
    signal.signal(signal.SIGINT, lambda *_: parar.set())
    Scheduler(tareas, SessionLocal, lambda clave: advisory_lock(engine, clave)).run_forever(parar)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
