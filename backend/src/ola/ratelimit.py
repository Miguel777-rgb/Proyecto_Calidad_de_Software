"""Limite de intentos por clave (una cuenta o una direccion IP).

Frena la fuerza bruta en el inicio de sesion y en la recuperacion de
contrasena: tras N intentos dentro de la ventana, la clave queda bloqueada
hasta que el mas antiguo sale de la ventana.

Vive en la memoria del proceso. En produccion la API corre con dos workers de
uvicorn, asi que en el peor caso el limite efectivo es el doble del
configurado. Para un solo VPS basta y no exige otra pieza de infraestructura.
"""

from __future__ import annotations

import math
import threading
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta

from ola.clock import Clock, SystemClock
from ola.config import Settings

# Por encima de estas claves se barren las vencidas: un atacante que prueba
# miles de correos distintos no debe hacer crecer la memoria sin limite.
MAX_KEYS_BEFORE_SWEEP = 10_000


class AttemptLimiter:
    def __init__(self, max_attempts: int, window: timedelta, clock: Clock | None = None) -> None:
        self._max = max_attempts
        self._window = window
        self._clock = clock or SystemClock()
        self._intentos: dict[str, deque[datetime]] = {}
        self._lock = threading.Lock()

    def _vigentes(self, key: str, ahora: datetime) -> deque[datetime] | None:
        intentos = self._intentos.get(key)
        if intentos is None:
            return None
        while intentos and ahora - intentos[0] >= self._window:
            intentos.popleft()
        if not intentos:
            del self._intentos[key]
            return None
        return intentos

    def retry_after(self, key: str) -> int | None:
        """Segundos que faltan para que ``key`` pueda volver a intentar; None si ya puede."""
        with self._lock:
            ahora = self._clock.now()
            intentos = self._vigentes(key, ahora)
            if intentos is None or len(intentos) < self._max:
                return None
            restante = intentos[0] + self._window - ahora
            return max(1, math.ceil(restante.total_seconds()))

    def record(self, key: str) -> None:
        with self._lock:
            ahora = self._clock.now()
            if len(self._intentos) >= MAX_KEYS_BEFORE_SWEEP:
                for clave in list(self._intentos):
                    self._vigentes(clave, ahora)
            self._intentos.setdefault(key, deque()).append(ahora)

    def reset(self, key: str) -> None:
        with self._lock:
            self._intentos.pop(key, None)


@dataclass(frozen=True)
class AuthLimiters:
    """Limites de la autenticacion. Cada aplicacion crea los suyos."""

    login_per_account: AttemptLimiter
    login_per_ip: AttemptLimiter
    reset_requests_per_ip: AttemptLimiter
    reset_failures_per_ip: AttemptLimiter

    @classmethod
    def from_settings(cls, settings: Settings, clock: Clock | None = None) -> AuthLimiters:
        ventana = timedelta(minutes=settings.rate_limit_window_minutes)

        def limite(maximo: int) -> AttemptLimiter:
            return AttemptLimiter(maximo, ventana, clock)

        return cls(
            login_per_account=limite(settings.login_failures_per_account),
            login_per_ip=limite(settings.login_failures_per_ip),
            reset_requests_per_ip=limite(settings.password_reset_requests_per_ip),
            reset_failures_per_ip=limite(settings.password_reset_failures_per_ip),
        )
