"""Primitivas para dibujar diagramas de clases UML con el sistema visual de Archify.

Se usan los tokens del tema claro de Archify (assets/template.html): fondo
#f4f5f7 con retícula, carriles con trazo discontinuo, cajas con relleno
translúcido por tipo, tipografía JetBrains Mono y los colores de flecha. El
color de estado se reserva para los hallazgos (rosa, token «security»), los
elementos nuevos (verde, token «arrow-emphasis») y los modificados (ámbar,
token «cloud»).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from html import escape

FUENTE = "'JetBrains Mono', 'DejaVu Sans Mono', monospace"
ANCHO_CAR = 0.6  # avance de JetBrains Mono en em

# Tokens del tema claro de Archify
T = {
    "bg": "#f4f5f7", "grid": "#e9edf2", "text": "#111827", "muted": "#5b6474",
    "dim": "#9aa3b2", "lane_fill": "rgba(248,250,252,0.65)", "lane_stroke": "#cbd5e1",
    "arrow": "#94a3b8", "emphasis": "#059669", "mask": "#ffffff",
    "frontend_fill": "rgba(34,211,238,0.15)", "frontend_stroke": "#0891b2",
    "backend_fill": "rgba(52,211,153,0.18)", "backend_stroke": "#059669",
    "database_fill": "rgba(167,139,250,0.20)", "database_stroke": "#7c3aed",
    "cloud_fill": "rgba(251,191,36,0.18)", "cloud_stroke": "#d97706",
    "security_fill": "rgba(251,113,133,0.15)", "security_stroke": "#e11d48",
    "external_fill": "rgba(148,163,184,0.18)", "external_stroke": "#64748b",
}

# Tipo de elemento UML -> estilo de Archify
TIPOS = {
    "module": ("external_fill", "external_stroke", None),
    "class": ("frontend_fill", "frontend_stroke", None),
    "dataclass": ("frontend_fill", "frontend_stroke", None),
    "protocol": ("frontend_fill", "frontend_stroke", "4 3"),
    "entity": ("database_fill", "database_stroke", None),
    "enum": ("database_fill", "database_stroke", None),
    "external": ("external_fill", "external_stroke", "5 3"),
    "stub": ("external_fill", "dim", "3 3"),
}

ESTADOS = {
    "hallazgo": (T["security_stroke"], "#fff1f2"),
    "nuevo": (T["emphasis"], "#ecfdf5"),
    "modificado": (T["cloud_stroke"], "#fffbeb"),
}

FS_NOMBRE, FS_ESTEREO, FS_MIEMBRO, FS_NOTA, FS_INSIGNIA = 10.0, 7.4, 8.2, 7.0, 7.0
LH = 10.4  # alto de línea de miembro
PAD_X = 6.0


def ancho_texto(texto: str, fs: float) -> float:
    return len(texto) * ANCHO_CAR * fs


def partir(linea: str, max_car: int) -> list[str]:
    """Parte una firma larga por la coma, el «):» o el «:» que deje la línea más larga."""
    if len(linea) <= max_car:
        return [linea]
    sangria = "    "
    partes, resto = [], linea
    while len(resto) > max_car:
        candidatos = []
        for sep, conservar in ((", ", 1), ("): ", 2), (": ", 1)):
            i = resto.rfind(sep, len(sangria) + 2, max_car)
            if i > 0:
                candidatos.append((i + conservar, i + len(sep)))
        if candidatos:
            fin_cabeza, inicio_cola = max(candidatos)
        else:
            fin_cabeza = inicio_cola = max_car
        partes.append(resto[:fin_cabeza])
        resto = sangria + resto[inicio_cola:]
    partes.append(resto)
    return partes


@dataclass
class Caja:
    id: str
    nombre: str
    estereotipo: str | None = None
    atributos: list[str] = field(default_factory=list)
    operaciones: list[str] = field(default_factory=list)
    tipo: str = "module"
    hallazgos: list[str] = field(default_factory=list)
    estado: str | None = None  # "nuevo" | "modificado"
    nota: str | None = None
    ancho_min: float = 0.0
    max_car: int = 46
    cursiva: bool = False
    insignia: bool = True  # False: color de estado sin repetir la insignia
    x: float = 0.0
    y: float = 0.0
    w: float = 0.0
    h: float = 0.0

    def medir(self) -> None:
        self._atr = [l for a in self.atributos for l in partir(a, self.max_car)]
        self._ops = [l for o in self.operaciones for l in partir(o, self.max_car)]
        anchos = [ancho_texto(self.nombre, FS_NOMBRE) + 4]
        if self.estereotipo:
            anchos.append(ancho_texto(f"«{self.estereotipo}»", FS_ESTEREO))
        anchos += [ancho_texto(l, FS_MIEMBRO) for l in self._atr + self._ops]
        if self.nota:
            anchos.append(ancho_texto(self.nota, FS_NOTA))
        insignia = self.texto_insignia() if self.insignia else ""
        if insignia:
            anchos.append(ancho_texto(insignia, FS_INSIGNIA) * 0.62 + ancho_texto(self.nombre, FS_NOMBRE) * 0.55)
        self.w = max(max(anchos) + 2 * PAD_X, self.ancho_min)
        self._cab = 7 + (FS_ESTEREO + 2.5 if self.estereotipo else 0) + FS_NOMBRE + 4
        h = self._cab
        if self._atr:
            h += 4 + len(self._atr) * LH + 2
        if self._ops:
            h += 4 + len(self._ops) * LH + 2
        if self.nota:
            h += 3 + FS_NOTA + 4
        self.h = h

    def texto_insignia(self) -> str:
        if self.estado == "nuevo":
            return "NUEVO"
        if self.estado == "modificado":
            return "MODIFICADO"
        return ""

    def ancla(self, lado: str, t: float = 0.5) -> tuple[float, float]:
        if lado == "arriba":
            return (self.x + self.w * t, self.y)
        if lado == "abajo":
            return (self.x + self.w * t, self.y + self.h)
        if lado == "izq":
            return (self.x, self.y + self.h * t)
        return (self.x + self.w, self.y + self.h * t)


@dataclass
class Marco:
    """Paquete UML (módulo de Python) que agrupa cajas."""

    id: str
    etiqueta: str
    hijos: list[str]
    pad: float = 9.0
    hallazgos: list[str] = field(default_factory=list)
    estado: str | None = None
    nota: str | None = None
    nota_arriba: bool = False
    nota_fuera: bool = False  # debajo del marco, alineada a la izquierda
    x: float = 0.0
    y: float = 0.0
    w: float = 0.0
    h: float = 0.0

    def ajustar(self, cajas: dict[str, Caja]) -> None:
        hs = [cajas[i] for i in self.hijos]
        x0 = min(c.x for c in hs) - self.pad
        y0 = min(c.y for c in hs) - self.pad - 13
        x1 = max(c.x + c.w for c in hs) + self.pad
        y1 = max(c.y + c.h for c in hs) + self.pad + (11 if self.nota and not (self.nota_arriba or self.nota_fuera) else 0)
        self.x, self.y, self.w, self.h = x0, y0, x1 - x0, y1 - y0

    def ancla(self, lado: str, t: float = 0.5) -> tuple[float, float]:
        return Caja.ancla(self, lado, t)  # type: ignore[arg-type]


@dataclass
class Carril:
    etiqueta: str
    x: float
    y: float
    w: float
    h: float


@dataclass
class Flecha:
    puntos: list[tuple[float, float]]
    tipo: str = "dep"  # dep | real | assoc | gen | gen-tramo | tramo | tramo-nuevo | tramo-hallazgo
    estilo: str = "normal"  # normal | hallazgo | nuevo
    etiqueta: str | None = None
    pos_etiqueta: tuple[float, float] | None = None
    mult: tuple[str | None, str | None] = (None, None)


class Lienzo:
    def __init__(self, ancho: float, alto: float, titulo: str, subtitulo: str) -> None:
        self.ancho, self.alto = ancho, alto
        self.titulo, self.subtitulo = titulo, subtitulo
        self.cajas: dict[str, Caja] = {}
        self.marcos: dict[str, Marco] = {}
        self.carriles: list[Carril] = []
        self.flechas: list[Flecha] = []
        self.leyenda: list[str] = []

    def caja(self, c: Caja) -> Caja:
        c.medir()
        self.cajas[c.id] = c
        return c

    def marco(self, m: Marco) -> Marco:
        m.ajustar(self.cajas)
        self.marcos[m.id] = m
        return m

    # ------------------------------------------------------------------ SVG
    def _defs(self) -> str:
        colores = {
            "normal": T["arrow"], "hallazgo": T["security_stroke"],
            "nuevo": T["emphasis"], "real": T["external_stroke"], "assoc": T["external_stroke"],
        }
        out = ['<defs>',
               '<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">'
               f'<path d="M 40 0 L 0 0 0 40" fill="none" stroke="{T["grid"]}" stroke-width="0.6"/></pattern>']
        for nombre, color in colores.items():
            out.append(
                f'<marker id="abierta-{nombre}" markerWidth="10" markerHeight="10" refX="8.6" refY="4" '
                f'orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8.6,4 L0,8" fill="none" '
                f'stroke="{color}" stroke-width="1.2" stroke-linejoin="round"/></marker>')
            out.append(
                f'<marker id="hueca-{nombre}" markerWidth="13" markerHeight="12" refX="11.5" refY="5.5" '
                f'orient="auto" markerUnits="userSpaceOnUse"><path d="M0.5,0.5 L11.5,5.5 L0.5,10.5 Z" '
                f'fill="#ffffff" stroke="{color}" stroke-width="1.1" stroke-linejoin="round"/></marker>')
        out.append('</defs>')
        return "\n".join(out)

    def _estilo(self) -> str:
        return (
            "<style>"
            f"text{{font-family:{FUENTE};}}"
            f".t-primary{{fill:{T['text']};}} .t-muted{{fill:{T['muted']};}} .t-dim{{fill:{T['dim']};}}"
            "</style>"
        )

    def _texto(self, x, y, s, fs, clase="t-primary", peso=None, ancla="start", cursiva=False, espaciado=None, color=None):
        attrs = [f'x="{x:.1f}"', f'y="{y:.1f}"', f'font-size="{fs}"']
        attrs.append(f'fill="{color}"' if color else f'class="{clase}"')
        if peso:
            attrs.append(f'font-weight="{peso}"')
        if ancla != "start":
            attrs.append(f'text-anchor="{ancla}"')
        if cursiva:
            attrs.append('font-style="italic"')
        if espaciado:
            attrs.append(f'letter-spacing="{espaciado}"')
        return f'<text {" ".join(attrs)}>{escape(s)}</text>'

    def _carril(self, c: Carril) -> str:
        return (
            f'<rect x="{c.x:.1f}" y="{c.y:.1f}" width="{c.w:.1f}" height="{c.h:.1f}" rx="10" '
            f'fill="{T["lane_fill"]}" stroke="{T["lane_stroke"]}" stroke-dasharray="6 6" stroke-width="1"/>'
            + self._texto(c.x + 10, c.y + 15, c.etiqueta.upper(), 8.6, "t-muted", 700, espaciado="0.08em")
        )

    def _marco(self, m: Marco) -> str:
        borde, _ = ESTADOS.get(m.estado or "", (T["dim"], None))
        if m.hallazgos and not m.estado:
            borde = T["security_stroke"]
        ancho_tab = ancho_texto(m.etiqueta, 7.8) + 14
        partes = [
            f'<rect x="{m.x:.1f}" y="{m.y + 13:.1f}" width="{m.w:.1f}" height="{m.h - 13:.1f}" rx="5" '
            f'fill="rgba(255,255,255,0.55)" stroke="{borde}" stroke-width="1"/>',
            f'<path d="M{m.x:.1f},{m.y + 13.5:.1f} L{m.x:.1f},{m.y + 4:.1f} Q{m.x:.1f},{m.y:.1f} {m.x + 4:.1f},{m.y:.1f} '
            f'L{m.x + ancho_tab - 4:.1f},{m.y:.1f} Q{m.x + ancho_tab:.1f},{m.y:.1f} {m.x + ancho_tab:.1f},{m.y + 4:.1f} '
            f'L{m.x + ancho_tab:.1f},{m.y + 13.5:.1f}" fill="#ffffff" stroke="{borde}" stroke-width="1"/>',
            self._texto(m.x + 7, m.y + 9.8, m.etiqueta, 7.8, "t-muted", 700),
        ]
        x_ins = m.x + ancho_tab + 6
        if m.estado:
            partes.append(self._insignia(x_ins, m.y + 1, m.estado.upper(), m.estado))
            x_ins += ancho_texto(m.estado.upper(), FS_INSIGNIA) + 12
        if m.hallazgos:
            partes.append(self._insignia(x_ins, m.y + 1, " ".join(m.hallazgos), "hallazgo"))
        if m.nota and m.nota_fuera:
            partes.append(self._texto(m.x + 4, m.y + m.h + 10, m.nota, FS_NOTA, "t-muted"))
        elif m.nota and m.nota_arriba:
            partes.append(self._texto(m.x + m.w - 7, m.y + 9.8, m.nota, FS_NOTA, "t-muted", ancla="end"))
        elif m.nota:
            partes.append(self._texto(m.x + m.w - 7, m.y + m.h - 5, m.nota, FS_NOTA, "t-muted", ancla="end"))
        return "\n".join(partes)

    def _insignia(self, x, y, texto, estado) -> str:
        color, fondo = ESTADOS[estado]
        w = ancho_texto(texto, FS_INSIGNIA) + 8
        return (
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="11" rx="3" fill="{fondo}" '
            f'stroke="{color}" stroke-width="0.8"/>'
            + self._texto(x + 4, y + 8.2, texto, FS_INSIGNIA, peso=700, color=color)
        )

    def _caja(self, c: Caja) -> str:
        relleno, trazo, guiones = TIPOS[c.tipo]
        color_trazo = T[trazo] if trazo in T else trazo
        ancho_trazo = 1.1
        if c.estado:
            color_trazo, ancho_trazo = ESTADOS[c.estado][0], 1.8
        elif c.hallazgos:
            color_trazo, ancho_trazo = T["security_stroke"], 1.6
        dash = f' stroke-dasharray="{guiones}"' if guiones else ""
        p = [
            f'<rect x="{c.x:.1f}" y="{c.y:.1f}" width="{c.w:.1f}" height="{c.h:.1f}" rx="4" fill="{T["mask"]}"/>',
            f'<rect x="{c.x:.1f}" y="{c.y:.1f}" width="{c.w:.1f}" height="{c.h:.1f}" rx="4" fill="{T[relleno]}" '
            f'stroke="{color_trazo}" stroke-width="{ancho_trazo}"{dash}/>',
        ]
        cx = c.x + c.w / 2
        y = c.y + 7
        if c.estereotipo:
            y += FS_ESTEREO
            p.append(self._texto(cx, y, f"«{c.estereotipo}»", FS_ESTEREO, "t-muted", ancla="middle"))
            y += 2.5
        y += FS_NOMBRE
        p.append(self._texto(cx, y, c.nombre, FS_NOMBRE, peso=700, ancla="middle", cursiva=c.cursiva))
        y = c.y + c._cab
        separador = f'stroke="{color_trazo}" stroke-opacity="0.45" stroke-width="0.8"'
        for bloque in (c._atr, c._ops):
            if not bloque:
                continue
            p.append(f'<line x1="{c.x:.1f}" y1="{y:.1f}" x2="{c.x + c.w:.1f}" y2="{y:.1f}" {separador}/>')
            y += 4
            for linea in bloque:
                y += LH
                p.append(self._texto(c.x + PAD_X, y - 2.4, linea, FS_MIEMBRO))
            y += 2
        if c.nota:
            p.append(f'<line x1="{c.x:.1f}" y1="{y:.1f}" x2="{c.x + c.w:.1f}" y2="{y:.1f}" {separador}/>')
            p.append(self._texto(c.x + c.w - PAD_X, y + 3 + FS_NOTA, c.nota, FS_NOTA, "t-muted", ancla="end"))
        if c.estado and c.insignia:
            p.append(self._insignia(c.x - 3, c.y - 6, c.estado.upper(), c.estado))
        if c.hallazgos:
            texto = " ".join(c.hallazgos)
            w = ancho_texto(texto, FS_INSIGNIA) + 8
            p.append(self._insignia(c.x + c.w - w + 3, c.y - 6, texto, "hallazgo"))
        return "\n".join(p)

    def _ruta(self, f: Flecha) -> str:
        return "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in f.puntos)

    def _flecha(self, f: Flecha) -> str:
        if f.tipo in ("tramo", "tramo-nuevo", "tramo-hallazgo"):
            color = {"tramo": T["arrow"], "tramo-nuevo": T["emphasis"], "tramo-hallazgo": T["security_stroke"]}[f.tipo]
            ancho = 1.1 if f.tipo == "tramo" else 1.35
            return (f'<path d="{self._ruta(f)}" fill="none" stroke="{color}" stroke-width="{ancho}" '
                    f'stroke-dasharray="4 3" stroke-linejoin="round"/>')
        if f.tipo in ("gen", "gen-tramo"):
            marca = ' marker-end="url(#hueca-real)"' if f.tipo == "gen" else ""
            return (f'<path d="{self._ruta(f)}" fill="none" stroke="{T["external_stroke"]}" stroke-width="1.1" '
                    f'stroke-linejoin="round"{marca}/>')
        if f.tipo == "real":
            clave = "real" if f.estilo == "normal" else f.estilo
            color = {"real": T["external_stroke"], "hallazgo": T["security_stroke"], "nuevo": T["emphasis"]}[clave]
            marca, dash, ancho = f"hueca-{clave}", "5 3", 1.0
        elif f.tipo == "assoc":
            clave = "assoc" if f.estilo == "normal" else f.estilo
            color = {"assoc": T["external_stroke"], "hallazgo": T["security_stroke"], "nuevo": T["emphasis"]}[clave]
            marca, dash, ancho = f"abierta-{clave}", None, 1.0 if f.estilo == "normal" else 1.3
        else:
            color = {"normal": T["arrow"], "hallazgo": T["security_stroke"], "nuevo": T["emphasis"]}[f.estilo]
            marca, dash, ancho = f"abierta-{f.estilo}", "4 3", 1.1 if f.estilo == "normal" else 1.35
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        p = [f'<path d="{self._ruta(f)}" fill="none" stroke="{color}" stroke-width="{ancho}"{dash_attr} '
             f'stroke-linejoin="round" marker-end="url(#{marca})"/>']
        if f.etiqueta and f.pos_etiqueta:
            x, y = f.pos_etiqueta
            w = ancho_texto(f.etiqueta, 7.2) + 6
            fill = color if f.estilo != "normal" else T["muted"]
            p.append(f'<rect x="{x - w / 2:.1f}" y="{y - 7.5:.1f}" width="{w:.1f}" height="10" rx="2" '
                     f'fill="{T["bg"]}" fill-opacity="0.92"/>')
            p.append(self._texto(x, y, f.etiqueta, 7.2, ancla="middle", color=fill, cursiva=True))
        for punto, vecino, mult in ((f.puntos[0], f.puntos[1], f.mult[0]), (f.puntos[-1], f.puntos[-2], f.mult[1])):
            if not mult:
                continue
            dx = (vecino[0] > punto[0]) - (vecino[0] < punto[0])
            dy = (vecino[1] > punto[1]) - (vecino[1] < punto[1])
            if dx:  # tramo horizontal: etiqueta encima de la línea, fuera de la caja
                x, y = punto[0] + dx * 6, punto[1] - 4
                ancla = "start" if dx > 0 else "end"
            else:  # tramo vertical: etiqueta a la derecha de la línea, fuera de la caja
                x, y = punto[0] + 4, punto[1] + dy * 6 + (3 if dy > 0 else 0)
                ancla = "start"
            p.append(self._texto(x, y, mult, 7.4, "t-muted", ancla=ancla))
        return "\n".join(p)

    def svg(self) -> str:
        p = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.ancho:.0f} {self.alto:.0f}" '
            f'width="{self.ancho:.0f}" height="{self.alto:.0f}" data-theme="light" xml:space="preserve">',
            self._estilo(), self._defs(),
            f'<rect width="100%" height="100%" fill="{T["bg"]}"/>',
            '<rect width="100%" height="100%" fill="url(#grid)"/>',
            self._texto(18, 27, self.titulo, 14, peso=700),
            self._texto(18, 42, self.subtitulo, 8.6, "t-muted"),
        ]
        p += [self._carril(c) for c in self.carriles]
        p += [self._marco(m) for m in self.marcos.values()]
        p += [self._flecha(f) for f in self.flechas]
        p += [self._caja(c) for c in self.cajas.values()]
        p += self.leyenda
        p.append("</svg>")
        return "\n".join(p)
