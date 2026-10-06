"""E-01b / E-06b. Las clases de db.models antes y después de la refactorización.

Uso: python fig_models.py antes|despues salida.svg
"""

from __future__ import annotations

import sys

from leyenda import leyenda
from modelos import clases_models
from uml_svg import Carril, Flecha, Lienzo, Marco

despues = sys.argv[1] == "despues"
if despues:
    L = Lienzo(0, 0, "Diseño propuesto — las clases de db.models",
               "E-06b · Los enumerados de los avisos pasan a domain.notices y db.models los importa "
               "(la persistencia depende del dominio). En rosa, los hallazgos que siguen pendientes.")
else:
    L = Lienzo(0, 0, "Diseño actual — las 15 clases de db.models",
               "Commit d5c054f · E-01b · Atributos completos en las clases del módulo «Alertas y avisos»; "
               "en las demás, nombre, estereotipo y métodos. NOM 9.")
C, M, F = L.cajas, L.marcos, L.flechas
for c in clases_models(despues):
    L.caja(c)


def pos(i, x, y):
    C[i].x, C[i].y = x, y


X0, Y0 = 16, 56
GAP = 64
col_w = [max(C[a].w, C[b].w) for a, b in (("subscription", "app_setting"), ("notification", "user"),
                                           ("alert_event", "import_run"), ("laboratory", "anomaly_reading"))]
x_base = X0 + 28
x_cols = []
x = x_base + C["base"].w + 70
for w in col_w:
    x_cols.append(x)
    x += w + GAP
fila0 = Y0 + 64
fila1 = fila0 + max(C["user_role"].h, C["import_status"].h) + 40
for i, ident in ((0, "app_setting"), (1, "user"), (2, "import_run"), (3, "anomaly_reading")):
    pos(ident, x_cols[i] + (col_w[i] - C[ident].w) / 2, fila1)
pos("user_role", C["user"].x + (C["user"].w - C["user_role"].w) / 2, fila0)
pos("import_status", C["import_run"].x + (C["import_run"].w - C["import_status"].w) / 2, fila0)
fondo1 = max(C[i].y + C[i].h for i in ("app_setting", "user", "import_run", "anomaly_reading"))
y_bus = fondo1 + 34
fila2 = y_bus + 46
for i, ident in ((0, "subscription"), (1, "notification"), (2, "alert_event"), (3, "laboratory")):
    pos(ident, x_cols[i] + (col_w[i] - C[ident].w) / 2, fila2)
pos("base", x_base, y_bus - C["base"].h / 2)
fondo2 = max(C[i].y + C[i].h for i in ("subscription", "notification", "alert_event", "laboratory"))
fila3 = fondo2 + 56
nt, ae = C["notification"], C["alert_event"]
enums = ["notification_channel", "notification_kind", "notification_status"]
ancho_enums = sum(C[e].w for e in enums) + 2 * 14
x = nt.x + nt.w / 2 - ancho_enums / 2 - 60
for e in enums:
    pos(e, x, fila3)
    x += C[e].w + 14
pos("alert_state", max(ae.x + (ae.w - C["alert_state"].w) / 2, x + 10), fila3)
fondo3 = max(C[i].y + C[i].h for i in enums + ["alert_state"])

modelos = ["base", "user_role", "user", "import_status", "anomaly_reading", "import_run", "app_setting",
           "laboratory", "alert_state", "alert_event", "subscription", "notification"]
if not despues:
    modelos += enums
etiqueta = "db.models · 12 clases · NOM 9" if despues else "db.models · 15 clases · NOM 9"
L.marco(Marco("m_models", etiqueta, modelos, pad=18, estado="modificado" if despues else None))
mm = M["m_models"]
if despues:
    # los enumerados trasladados quedan fuera del marco, en domain.notices
    desplazar = mm.y + mm.h + 40 - fila3
    for e in enums:
        C[e].y += desplazar
    fondo3 = max(C[e].y + C[e].h for e in enums)
    L.marco(Marco("m_notices", "domain.notices", enums, estado="nuevo", nota="ver Figura 2a", nota_arriba=True))

L.carriles.append(Carril("Persistencia y dominio" if despues else "Persistencia", X0, Y0,
                         max(c.x + c.w for c in C.values()) + 30 - X0, max(fondo3, mm.y + mm.h) + 18 - Y0))

# ------------------------------------------------------------- generalización (árbol hacia Base)
bs = C["base"]
x_fin = x_cols[3] + col_w[3] / 2 + 24
F.append(Flecha([(x_fin, y_bus), bs.ancla("der", 0.5)], "gen"))
for ident in ("app_setting", "user", "import_run", "anomaly_reading"):
    c = C[ident]
    F.append(Flecha([(c.x + c.w * 0.3, c.y + c.h), (c.x + c.w * 0.3, y_bus)], "gen-tramo"))
for ident in ("subscription", "notification", "alert_event", "laboratory"):
    c = C[ident]
    F.append(Flecha([(c.x + c.w * 0.3, c.y), (c.x + c.w * 0.3, y_bus)], "gen-tramo"))

# ------------------------------------------------------------- asociaciones
us, ir, ar, ap = C["user"], C["import_run"], C["anomaly_reading"], C["app_setting"]
sb, lb = C["subscription"], C["laboratory"]
y_f1 = fila1 + min(ap.h, us.h, ir.h, ar.h) * 0.62
F.append(Flecha([(ap.x + ap.w, y_f1), (us.x, y_f1)], "assoc", mult=("*", "0..1")))
F.append(Flecha([(ir.x, y_f1), (us.x + us.w, y_f1)], "assoc", mult=("*", "0..1")))
F.append(Flecha([(ar.x, y_f1), (ir.x + ir.w, y_f1)], "assoc", mult=("*", "0..1")))
F.append(Flecha([(ar.x + ar.w * 0.72, ar.y + ar.h), (ar.x + ar.w * 0.72, lb.y)], "assoc", mult=("*", "1")))
F.append(Flecha([(nt.x + nt.w * 0.72, nt.y), (nt.x + nt.w * 0.72, us.y + us.h)], "assoc", mult=("*", "1")))
y_f2 = fila2 + 52
F.append(Flecha([(nt.x + nt.w, y_f2), (ae.x, y_f2)], "assoc", mult=("*", "1")))
F.append(Flecha([(ae.x + ae.w, y_f2), (lb.x, y_f2)], "assoc", mult=("*", "1")))
y_sub = y_bus - 14
F.append(Flecha([(sb.x + sb.w * 0.75, sb.y), (sb.x + sb.w * 0.75, y_sub), (us.x + us.w * 0.12, y_sub),
                 (us.x + us.w * 0.12, us.y + us.h)], "assoc", mult=("*", "1")))
y_bajo = fondo2 + 18
F.append(Flecha([(sb.x + sb.w * 0.5, sb.y + sb.h), (sb.x + sb.w * 0.5, y_bajo), (lb.x + lb.w * 0.5, y_bajo),
                 (lb.x + lb.w * 0.5, lb.y + lb.h)], "assoc", mult=("*", "1")))
# ------------------------------------------------------------- uso de enumerados
estilo_enum = "nuevo" if despues else "normal"
F.append(Flecha([(us.x + us.w * 0.5, us.y), (us.x + us.w * 0.5, C["user_role"].y + C["user_role"].h)], "dep"))
F.append(Flecha([(ir.x + ir.w * 0.5, ir.y), (ir.x + ir.w * 0.5, C["import_status"].y + C["import_status"].h)], "dep"))
ast_ = C["alert_state"]
F.append(Flecha([(ae.x + ae.w * 0.62, ae.y + ae.h), (ae.x + ae.w * 0.62, ast_.y - 20), (ast_.x + ast_.w * 0.5, ast_.y - 20),
                 (ast_.x + ast_.w * 0.5, ast_.y)], "dep"))
for k, e in enumerate(enums):
    c = C[e]
    x_salida = nt.x + nt.w * (0.25 + 0.2 * k)
    x_entrada = c.x + c.w * (0.72 if k == 0 else 0.5)
    y_giro = fondo2 + 32 + 6 * k
    F.append(Flecha([(x_salida, nt.y + nt.h), (x_salida, y_giro), (x_entrada, y_giro), (x_entrada, c.y)],
                    "dep", estilo_enum))

L.ancho = max(c.x + c.w for c in C.values()) + 46
y_ley = L.carriles[0].y + L.carriles[0].h + 22
L.leyenda += leyenda(L, X0 + 4, y_ley, L.ancho - 40, ["hallazgo", "modificado", "nuevo"] if despues else ["hallazgo"],
                     flecha_nueva=despues, generalizacion=True, notas=[
                         "Todas las entidades heredan de Base (árbol de generalización). {PK}, {FK} y {unique} vienen "
                         "de las columnas y restricciones de SQLAlchemy."])
L.alto = y_ley + 16 * 4 + 12
salida = sys.argv[2]
open(salida, "w", encoding="utf-8").write(L.svg())
print(f"ok {salida} {L.ancho:.0f}x{L.alto:.0f}")
