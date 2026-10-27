"""Conexion con Uptime Kuma, compartida por configurar.py y reporte.py."""

from __future__ import annotations

import os
from dataclasses import dataclass

from uptime_kuma_api import UptimeKumaApi

INTERVALO_S = 60


@dataclass(frozen=True)
class Monitor:
    nombre: str
    url: str


def variable(nombre: str) -> str:
    valor = os.environ.get(nombre, "").strip()
    if not valor:
        raise SystemExit(f"Falta la variable {nombre}. Revisa tu .env (ver .env.example).")
    return valor


def monitores() -> list[Monitor]:
    """El backend local siempre; el VPS solo si OLA_VPS_URL esta definida."""
    lista = [Monitor("OLA API /health/ready", variable("OLA_SALUD_URL"))]
    vps = os.environ.get("OLA_VPS_URL", "").strip().rstrip("/")
    if vps:
        lista.append(Monitor("OLA VPS /health/ready", f"{vps}/api/health/ready"))
    return lista


def conectar() -> UptimeKumaApi:
    """Abre la conexion e inicia sesion; crea la cuenta local si no existe."""
    api = UptimeKumaApi(variable("UPTIME_KUMA_URL"))
    usuario, clave = variable("UPTIME_KUMA_USUARIO"), variable("UPTIME_KUMA_CLAVE")
    if api.need_setup():
        api.setup(usuario, clave)
        print(f"Cuenta local «{usuario}» creada en Uptime Kuma.")
    api.login(usuario, clave)
    return api
