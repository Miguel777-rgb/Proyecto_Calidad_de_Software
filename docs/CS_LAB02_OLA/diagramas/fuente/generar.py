"""Genera los cuatro diagramas UML de la Práctica 02 y los exporta a PDF (A4 horizontal) y PNG.

Uso, desde esta carpeta:  python generar.py [carpeta de salida]   (por defecto, la carpeta padre)
Requiere Python 3.11+, rsvg-convert (librsvg) y la tipografía JetBrains Mono instalada.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SALIDA = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else AQUI.parent

FIGURAS = [
    (["fig_e01a.py"], "E-01a_diseno_actual_modulo"),
    (["fig_models.py", "antes"], "E-01b_diseno_actual_db_models"),
    (["fig_e06a.py"], "E-06a_diseno_propuesto_modulo"),
    (["fig_models.py", "despues"], "E-06b_diseno_propuesto_db_models"),
]


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    for script, nombre in FIGURAS:
        svg = SALIDA / f"{nombre}.svg"
        subprocess.run([sys.executable, str(AQUI / script[0]), *script[1:], str(svg)], check=True, cwd=AQUI)
        ancho, alto = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg.read_text()).groups())
        escala = min(277 / ancho, 190 / alto)  # A4 horizontal con márgenes de 10 mm
        w, h = ancho * escala, alto * escala
        subprocess.run(["rsvg-convert", "-f", "pdf", "--page-width", "297mm", "--page-height", "210mm",
                        "--left", f"{(297 - w) / 2:.2f}mm", "--top", f"{(210 - h) / 2:.2f}mm",
                        "-w", f"{w:.2f}mm", "-a", str(svg), "-o", str(SALIDA / f"{nombre}.pdf")], check=True)
        subprocess.run(["rsvg-convert", "-z", "2.5", "-b", "white", str(svg),
                        "-o", str(SALIDA / f"{nombre}.png")], check=True)
        svg.unlink()
        print(f"{nombre}: {ancho:.0f}x{alto:.0f} px, miembros a {8.2 * escala / 0.3528:.1f} pt en A4")


if __name__ == "__main__":
    main()
