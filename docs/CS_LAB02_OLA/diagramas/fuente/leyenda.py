"""Leyenda común a las figuras: tipos de elemento, estados y relaciones UML."""

from __future__ import annotations

from uml_svg import ESTADOS, FS_INSIGNIA, T, TIPOS, Lienzo, ancho_texto

NOMBRES_TIPO = [
    ("module", "«module»: funciones de un módulo"),
    ("dataclass", "clase o dataclass"),
    ("protocol", "«protocol»: interfaz"),
    ("entity", "entidad o enumerado"),
    ("external", "biblioteca externa"),
    ("stub", "fuera del alcance"),
]
NOMBRES_ESTADO = {"hallazgo": "con hallazgo", "nuevo": "elemento nuevo", "modificado": "módulo modificado"}
FS = 7.8
FILA = 16


def leyenda(L: Lienzo, x: float, y: float, ancho: float, estados: list[str],
            flecha_nueva: bool = False, generalizacion: bool = False,
            notas: list[str] | None = None) -> list[str]:
    p = [L._texto(x, y, "LEYENDA", 8.4, "t-muted", 700, espaciado="0.08em")]
    y += FILA
    cx = x

    def avanzar(ancho_item: float) -> tuple[float, float]:
        nonlocal cx, y
        if cx + ancho_item > x + ancho and cx > x:
            cx, y = x, y + FILA
        inicio = cx
        cx += ancho_item + 14
        return inicio, y

    for tipo, nombre in NOMBRES_TIPO:
        relleno, trazo, guiones = TIPOS[tipo]
        color = T[trazo] if trazo in T else trazo
        dash = f' stroke-dasharray="{guiones}"' if guiones else ""
        ix, iy = avanzar(20 + ancho_texto(nombre, FS))
        p.append(f'<rect x="{ix:.1f}" y="{iy - 8:.1f}" width="15" height="10" rx="2" fill="{T[relleno]}" '
                 f'stroke="{color}" stroke-width="1"{dash}/>')
        p.append(L._texto(ix + 20, iy, nombre, FS, "t-muted"))
    for estado in estados:
        color, fondo = ESTADOS[estado]
        etiqueta = {"hallazgo": "H-xx", "nuevo": "NUEVO", "modificado": "MODIFICADO"}[estado]
        w = ancho_texto(etiqueta, FS_INSIGNIA) + 8
        ix, iy = avanzar(w + 5 + ancho_texto(NOMBRES_ESTADO[estado], FS))
        p.append(f'<rect x="{ix:.1f}" y="{iy - 9:.1f}" width="{w:.1f}" height="11" rx="3" fill="{fondo}" '
                 f'stroke="{color}" stroke-width="0.8"/>')
        p.append(L._texto(ix + 4, iy - 0.8, etiqueta, FS_INSIGNIA, peso=700, color=color))
        p.append(L._texto(ix + w + 5, iy, NOMBRES_ESTADO[estado], FS, "t-muted"))
    relaciones = [("dependencia", T["arrow"], "4 3", "abierta-normal"),
                  ("dependencia con hallazgo", T["security_stroke"], "4 3", "abierta-hallazgo")]
    if flecha_nueva:
        relaciones.append(("dependencia nueva", T["emphasis"], "4 3", "abierta-nuevo"))
    relaciones += [("realización", T["external_stroke"], "5 3", "hueca-real")]
    if generalizacion:
        relaciones.append(("generalización", T["external_stroke"], None, "hueca-real"))
    relaciones.append(("asociación con multiplicidad", T["external_stroke"], None, "abierta-assoc"))
    for nombre, color, dash, marca in relaciones:
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        ix, iy = avanzar(34 + ancho_texto(nombre, FS))
        p.append(f'<path d="M{ix:.1f},{iy - 3:.1f} L{ix + 28:.1f},{iy - 3:.1f}" fill="none" stroke="{color}" '
                 f'stroke-width="1.1"{dash_attr} marker-end="url(#{marca})"/>')
        p.append(L._texto(ix + 34, iy, nombre, FS, "t-muted"))
    for nota in notas or []:
        y += FILA
        p.append(L._texto(x, y, nota, FS, "t-muted", cursiva=True))
    return p
