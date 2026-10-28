"""Registro (logs) y rastreo de errores de la API y de las tareas programadas.

Con OLA_LOG_FORMAT=json cada linea es un objeto JSON (fecha, nivel, origen,
mensaje y, si lo hay, la traza del error): un recolector puede filtrarlas y
contarlas sin expresiones regulares. Por defecto es texto, mas comodo de leer.

Con OLA_SENTRY_DSN, los errores no controlados y los logs de nivel ERROR llegan
a Sentry o a GlitchTip, que acepta el mismo SDK y puede alojarse en el VPS.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from ola.config import Settings

TEXT_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"
# Loggers de uvicorn: en JSON se les quitan sus manejadores de texto para que
# pasen por el de la raiz y todo el contenedor escriba el mismo formato.
UVICORN_LOGGERS = ("uvicorn", "uvicorn.error", "uvicorn.access")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        datos: dict[str, object] = {
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            datos["exception"] = self.formatException(record.exc_info)
        return json.dumps(datos, ensure_ascii=False)


def configure_logging(settings: Settings, root: logging.Logger | None = None) -> None:
    """Configura la raiz del registro una sola vez, como logging.basicConfig.

    Si la raiz ya tiene manejadores (por ejemplo, los de pytest) no los toca.
    """
    raiz = root if root is not None else logging.getLogger()
    raiz.setLevel(settings.log_level)
    if raiz.handlers:
        return
    manejador = logging.StreamHandler()
    if settings.log_format == "json":
        manejador.setFormatter(JsonFormatter())
        for nombre in UVICORN_LOGGERS:
            logger = logging.getLogger(nombre)
            logger.handlers.clear()
            logger.propagate = True
    else:
        manejador.setFormatter(logging.Formatter(TEXT_FORMAT))
    raiz.addHandler(manejador)


def init_error_tracking(settings: Settings) -> bool:
    """Activa Sentry o GlitchTip si hay DSN. Devuelve si quedo activo."""
    if not settings.sentry_dsn:
        return False
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.env,
        # Sin datos personales (correos, IP) ni trazas de rendimiento: solo errores.
        send_default_pii=False,
        traces_sample_rate=0.0,
    )
    return True
