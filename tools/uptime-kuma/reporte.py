"""Resume la disponibilidad medida por Uptime Kuma para docs/calidad.md.

    docker compose --profile calidad run --rm calidad reporte.py --horas 168
"""

from __future__ import annotations

import argparse

from comun import conectar, monitores
from disponibilidad import Latido, formatear, resumir


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--horas", type=int, default=24 * 7, help="periodo hacia atrás (por defecto, 7 días)")
    horas = parser.parse_args().horas

    api = conectar()
    try:
        ids = {m["name"]: m["id"] for m in api.get_monitors()}
        for monitor in monitores():
            print(f"\n### {monitor.nombre}\n")
            if monitor.nombre not in ids:
                print("Sin monitor. Ejecuta primero configurar.py.")
                continue
            crudos = api.get_monitor_beats(ids[monitor.nombre], horas)
            print(formatear(resumir(Latido.desde_uptime_kuma(c) for c in crudos), horas=horas))
    finally:
        api.disconnect()


if __name__ == "__main__":
    main()
