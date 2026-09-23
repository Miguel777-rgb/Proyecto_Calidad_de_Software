"""Deja Uptime Kuma listo para medir la disponibilidad del backend.

Crea la cuenta local y un monitor por cada backend: el de Docker en el equipo
y, si OLA_VPS_URL esta definida, el desplegado en el VPS. Cada uno consulta
/api/health/ready cada minuto. Se puede ejecutar varias veces: no duplica nada.

    docker compose --profile calidad run --rm calidad configurar.py
"""

from __future__ import annotations

from comun import INTERVALO_S, conectar, monitores
from uptime_kuma_api import MonitorType


def main() -> None:
    api = conectar()
    try:
        existentes = {m["name"]: m["id"] for m in api.get_monitors()}
        for monitor in monitores():
            if monitor.nombre in existentes:
                print(f"El monitor «{monitor.nombre}» ya existe (id {existentes[monitor.nombre]}).")
                continue
            creado = api.add_monitor(
                type=MonitorType.HTTP,
                name=monitor.nombre,
                url=monitor.url,
                interval=INTERVALO_S,
                retryInterval=INTERVALO_S,
                # Sin reintentos: un chequeo fallido ya cuenta como caida. Medir
                # con reintentos esconderia las caidas cortas.
                maxretries=0,
            )
            print(f"Monitor creado (id {creado['monitorID']}): {monitor.url} cada {INTERVALO_S} s.")
    finally:
        api.disconnect()


if __name__ == "__main__":
    main()
