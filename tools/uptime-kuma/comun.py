"""Conexion con Uptime Kuma, compartida por configurar.py y reporte.py."""

from __future__ import annotations

import os

from uptime_kuma_api import UptimeKumaApi

NOMBRE_MONITOR = "OLA API /health/ready"
INTERVALO_S = 60


def variable(nombre: str) -> str:
    valor = os.environ.get(nombre, "").strip()
    if not valor:
        raise SystemExit(f"Falta la variable {nombre}. Revisa tu .env (ver .env.example).")
    return valor


def conectar() -> UptimeKumaApi:
    """Abre la conexion e inicia sesion; crea la cuenta local si no existe."""
    api = UptimeKumaApi(variable("UPTIME_KUMA_URL"))
    usuario, clave = variable("UPTIME_KUMA_USUARIO"), variable("UPTIME_KUMA_CLAVE")
    if api.need_setup():
        api.setup(usuario, clave)
        print(f"Cuenta local «{usuario}» creada en Uptime Kuma.")
    api.login(usuario, clave)
    return api
