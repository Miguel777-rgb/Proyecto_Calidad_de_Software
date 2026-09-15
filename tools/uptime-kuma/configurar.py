"""Deja Uptime Kuma listo para medir la disponibilidad del backend.

Crea la cuenta local y un monitor que consulta /api/health/ready cada
minuto. Se puede ejecutar varias veces: no duplica nada.

    docker compose --profile calidad run --rm calidad configurar.py
"""

from __future__ import annotations

from comun import INTERVALO_S, NOMBRE_MONITOR, conectar, variable
from uptime_kuma_api import MonitorType


def main() -> None:
    objetivo = variable("OLA_SALUD_URL")
    api = conectar()
    try:
        existente = next((m for m in api.get_monitors() if m["name"] == NOMBRE_MONITOR), None)
        if existente is not None:
            print(f"El monitor «{NOMBRE_MONITOR}» ya existe (id {existente['id']}).")
            return
        creado = api.add_monitor(
            type=MonitorType.HTTP,
            name=NOMBRE_MONITOR,
            url=objetivo,
            interval=INTERVALO_S,
            retryInterval=INTERVALO_S,
            # Sin reintentos: un chequeo fallido ya cuenta como caida. Medir con
            # reintentos escondería las caídas cortas.
            maxretries=0,
        )
        print(f"Monitor creado (id {creado['monitorID']}): {objetivo} cada {INTERVALO_S} s.")
    finally:
        api.disconnect()


if __name__ == "__main__":
    main()
