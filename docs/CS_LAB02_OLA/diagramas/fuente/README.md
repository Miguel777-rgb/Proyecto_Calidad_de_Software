# Fuente de los diagramas UML (Práctica de Laboratorio 02)

Generador de las figuras E-01a, E-01b, E-06a y E-06b. Dibuja diagramas de clases UML con el sistema
visual de Archify (tema claro: paleta, tipografía JetBrains Mono, carriles y flechas) en SVG y los
exporta a PDF A4 horizontal y a PNG.

```bash
python generar.py            # escribe los PDF y PNG en la carpeta padre (diagramas/)
```

Requiere Python 3.11 o superior (solo biblioteca estándar), `rsvg-convert` (librsvg) y la tipografía
JetBrains Mono instalada. El contenido de cada caja está en `contenido.py` y `modelos.py`; la
disposición de cada figura, en `fig_e01a.py`, `fig_models.py` y `fig_e06a.py`.
