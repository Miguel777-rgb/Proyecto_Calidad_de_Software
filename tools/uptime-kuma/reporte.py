"""Resume la disponibilidad medida por Uptime Kuma para docs/calidad.md.

    docker compose --profile calidad run --rm calidad reporte.py --horas 168
"""

from __future__ import annotations

import argparse

from comun import NOMBRE_MONITOR, conectar
from disponibilidad import Latido, formatear, resumir


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--horas", type=int, default=24 * 7, help="periodo hacia atrás (por defecto, 7 días)")
    horas = parser.parse_args().horas

    api = conectar()
    try:
        monitor = next((m for m in api.get_monitors() if m["name"] == NOMBRE_MONITOR), None)
        if monitor is None:
            raise SystemExit("No existe el monitor. Ejecuta primero configurar.py.")
        crudos = api.get_monitor_beats(monitor["id"], horas)
    finally:
        api.disconnect()

    print(formatear(resumir(Latido.desde_uptime_kuma(c) for c in crudos), horas=horas))


if __name__ == "__main__":
    main()
