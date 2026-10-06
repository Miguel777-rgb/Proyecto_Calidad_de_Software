"""E-01a. Diagrama de clases del diseño actual del módulo «Alertas y avisos» (commit d5c054f)."""

from __future__ import annotations

import sys

from contenido import (
    alert_service, deps, dominio_comun, entidades_compactas, notification_service_antes,
    notifications_repo_antes, repos, routers_alerts, routers_subs,
)
from leyenda import leyenda
from uml_svg import Carril, Flecha, Lienzo, Marco

L = Lienzo(0, 0, "Diseño actual del módulo «Alertas y avisos» — diagrama de clases",
           "Commit d5c054f · E-01a · En rosa, las unidades y dependencias con hallazgos (H-xx). "
           "Los atributos de las entidades están en la Figura 1b.")
C, M, F = L.cajas, L.marcos, L.flechas
for c in (routers_alerts(False), routers_subs(), deps(False), *alert_service(),
          *notification_service_antes(), *repos(False), notifications_repo_antes(),
          *dominio_comun(), *entidades_compactas(False)):
    L.caja(c)


def pos(i, x, y):
    C[i].x, C[i].y = x, y


def baja(c, t=0.5):
    return c.ancla("abajo", t)


def sube(c, t=0.5):
    return c.ancla("arriba", t)


def t_en(c, x):
    return (x - c.x) / c.w


X0, API_Y = 16, 56
ra, rs, dp = C["routers_alerts"], C["routers_subs"], C["deps"]
al, es, ns, sm = C["alert_service"], C["evaluation_summary"], C["notification_service"], C["send_summary"]
arp, srp, nrp, ss = C["alerts_repo"], C["subscriptions_repo"], C["notifications_repo"], C["session"]

# --------------------------------------------------------------- API
TOP = API_Y + 48
pos("routers_alerts", 58, TOP)
pos("routers_subs", ra.x + ra.w + 20, TOP)
pos("deps", rs.x + rs.w + 16, TOP)
api_fondo = max(ra.y + ra.h, rs.y + rs.h, dp.y + dp.h) + 14

# --------------------------------------------------------------- Servicios
SERV_Y = api_fondo + 12
CAJAS_SERV = SERV_Y + 64 + 22
pos("alert_service", 58, CAJAS_SERV)
pos("evaluation_summary", 58, al.y + al.h + 10)
L.marco(Marco("m_alert", "services.alert_service", ["alert_service", "evaluation_summary"]))
F1R = M["m_alert"].x + M["m_alert"].w
CORR = [rs.x + 8, rs.x + 18, rs.x + 28, rs.x + 38]  # pasillo entre los marcos de servicios
assert F1R < CORR[0] - 4, (F1R, CORR)
F2L = CORR[3] + 12
pos("notification_service", F2L + 9, CAJAS_SERV)
pos("send_summary", ns.x + ns.w + 12, CAJAS_SERV)
L.marco(Marco("m_notif", "services.notification_service", ["notification_service", "send_summary"]))
serv_fondo = max(M["m_alert"].y + M["m_alert"].h, M["m_notif"].y + M["m_notif"].h) + 12

# --------------------------------------------------------------- Repositorios
REPO_Y = serv_fondo + 12
CAJAS_REPO = REPO_Y + 52
pos("alerts_repo", 58, CAJAS_REPO)
pos("subscriptions_repo", CORR[1] - 10, CAJAS_REPO)
pos("notifications_repo", srp.x + srp.w + 22, CAJAS_REPO)
repo_fondo = max(arp.y + arp.h, srp.y + srp.h, nrp.y + nrp.h) + 14

ANCHO_IZQ = max(dp.x + dp.w, nrp.x + nrp.w, M["m_notif"].x + M["m_notif"].w) + 16 - X0
DER_IZQ = X0 + ANCHO_IZQ

# --------------------------------------------------------------- Persistencia
PERS_Y = repo_fondo + 12
CAJAS_PERS = PERS_Y + 50 + 22
ex = 80
for i in ("laboratory", "alert_event", "notification", "subscription"):
    pos(i, ex, CAJAS_PERS)
    ex += C[i].w + 46
L.marco(Marco("m_models", "db.models", ["laboratory", "alert_event", "notification", "subscription"],
              nota="15 clases · NOM 9 · detalle en la Figura 1b", nota_fuera=True))
pos("session", nrp.x + 36, PERS_Y + 56)
pers_fondo = max(M["m_models"].y + M["m_models"].h, ss.y + ss.h) + 14

L.carriles += [
    Carril("API", X0, API_Y, ANCHO_IZQ, api_fondo - API_Y),
    Carril("Servicios", X0, SERV_Y, ANCHO_IZQ, serv_fondo - SERV_Y),
    Carril("Repositorios", X0, REPO_Y, ANCHO_IZQ, repo_fondo - REPO_Y),
    Carril("Persistencia", X0, PERS_Y, ANCHO_IZQ, pers_fondo - PERS_Y),
]

# --------------------------------------------------------------- Dominio e infraestructura
PX = DER_IZQ + 18
C1 = PX + 18
pos("streaks", C1 + 9, API_Y + 40 + 22)
pos("run", C1 + 9, C["streaks"].y + C["streaks"].h + 10)
L.marco(Marco("m_streaks", "domain.streaks", ["streaks", "run"]))
pos("messages", C1 + 9, M["m_streaks"].y + M["m_streaks"].h + 22 + 22)
pos("alert_message", C1 + 9, C["messages"].y + C["messages"].h + 10)
L.marco(Marco("m_messages", "domain.messages", ["messages", "alert_message"]))
pos("streak", C1 + 9, M["m_messages"].y + M["m_messages"].h + 22 + 22)
L.marco(Marco("m_types", "domain.types (solo Streak)", ["streak"]))
C1R = max(M[m].x + M[m].w for m in ("m_streaks", "m_messages", "m_types"))
C2 = C1R + 26
mail_y = API_Y + 40 + 22
pos("email", C2 + 9, mail_y)
pos("mailer", C["email"].x + C["email"].w + 26, mail_y)
fila2 = mail_y + max(C["email"].h, C["mailer"].h) + 28
pos("smtp_mailer", C2 + 9, fila2)
pos("recording_mailer", C["smtp_mailer"].x + C["smtp_mailer"].w + 14, fila2)
L.marco(Marco("m_mail", "mail", ["email", "mailer", "smtp_mailer", "recording_mailer"], nota="NOM 5 · Ce 1 · Ca 2"))
pos("settings", C2 + 9, M["m_mail"].y + M["m_mail"].h + 22)
clk_y = C["settings"].y + C["settings"].h + 30 + 22
pos("clock", C2 + 60, clk_y)
pos("system_clock", C2 + 9, clk_y + C["clock"].h + 28)
pos("fixed_clock", C["system_clock"].x + C["system_clock"].w + 14, clk_y + C["clock"].h + 28)
L.marco(Marco("m_clock", "clock", ["clock", "system_clock", "fixed_clock"], hallazgos=["H-04"],
              nota="NOM 4 · Ce 0 · Ca 0"))
C2R = max(M["m_mail"].x + M["m_mail"].w, M["m_clock"].x + M["m_clock"].w)
ANCHO_DER = C2R + 18 - PX
L.carriles.append(Carril("Dominio e infraestructura", PX, API_Y, ANCHO_DER, repo_fondo - API_Y))
L.ancho = PX + ANCHO_DER + 16
L.alto = pers_fondo + 16

# --------------------------------------------------------------- relaciones
RA = [SERV_Y + 12, SERV_Y + 19, SERV_Y + 26]               # pistas de los routers (banda A)
SA = [SERV_Y + 36, SERV_Y + 43, SERV_Y + 50, SERV_Y + 57]  # pistas de los servicios (banda A)
RB = [REPO_Y + 12, REPO_Y + 19, REPO_Y + 26, REPO_Y + 33, REPO_Y + 40]
RC = [PERS_Y + 12, PERS_Y + 19, PERS_Y + 26, PERS_Y + 33]
XD = [DER_IZQ + 4, DER_IZQ + 10, DER_IZQ + 16, DER_IZQ + 22]  # pasillo entre regiones
XG = C1R + 13                                               # pasillo entre columnas del dominio

# API -> servicios
F.append(Flecha([baja(ra, 0.5), (baja(ra, 0.5)[0], al.y)], "dep"))
x_rs_ns = ns.x + 0.55 * ns.w
F.append(Flecha([baja(rs, t_en(rs, x_rs_ns)), (x_rs_ns, ns.y)], "dep"))
F.append(Flecha([baja(ra, 0.78), (baja(ra, 0.78)[0], RA[0]), (ns.x + 0.15 * ns.w, RA[0]), (ns.x + 0.15 * ns.w, ns.y)], "dep"))
# API -> repositorios (H-10)
xi = X0 + 14
F.append(Flecha([ra.ancla("izq", 0.85), (xi, ra.ancla("izq", 0.85)[1]), (xi, arp.ancla("izq", 0.3)[1]), arp.ancla("izq", 0.3)],
                "dep", "hallazgo", "H-10", (xi + 14, (api_fondo + REPO_Y) / 2)))
F.append(Flecha([baja(rs, t_en(rs, CORR[1])), (CORR[1], srp.y)], "dep", "hallazgo"))
F.append(Flecha([baja(rs, t_en(rs, CORR[2])), (CORR[2], RB[2]), (nrp.x + 0.12 * nrp.w, RB[2]), (nrp.x + 0.12 * nrp.w, nrp.y)],
                "dep", "hallazgo", "H-10", (CORR[2] + 1, (serv_fondo + SERV_Y) / 2 + 30)))
F.append(Flecha([baja(ra, 0.95), (baja(ra, 0.95)[0], RA[1]), (CORR[3], RA[1]), (CORR[3], RB[3]),
                 (nrp.x + 0.04 * nrp.w, RB[3]), (nrp.x + 0.04 * nrp.w, nrp.y)], "dep", "hallazgo"))
# servicios -> repositorios
F.append(Flecha([al.ancla("der", 0.55), (CORR[0], al.ancla("der", 0.55)[1]), (CORR[0], RB[0]),
                 (arp.x + 0.8 * arp.w, RB[0]), (arp.x + 0.8 * arp.w, arp.y)], "dep"))
x_ns_srp = ns.x + 0.08 * ns.w
F.append(Flecha([baja(ns, 0.08), (x_ns_srp, RB[1]), (srp.x + 0.85 * srp.w, RB[1]), (srp.x + 0.85 * srp.w, srp.y)], "dep"))
x_ns_nrp = nrp.x + 0.5 * nrp.w
F.append(Flecha([baja(ns, t_en(ns, x_ns_nrp)), (x_ns_nrp, nrp.y)], "dep"))
# SQL embebido (H-01, H-06)
x_hueco = (srp.x + srp.w + nrp.x) / 2
x_s = [ss.x + ss.w * t for t in (0.12, 0.28, 0.44, 0.6, 0.76, 0.9)]
F.append(Flecha([baja(ns, t_en(ns, x_hueco)), (x_hueco, RC[1]), (x_s[1], RC[1]), (x_s[1], ss.y)], "dep", "hallazgo",
                "SQL embebido (4)", ((x_hueco + x_s[1]) / 2 + 30, RC[1])))
F.append(Flecha([al.ancla("izq", 0.3), (X0 + 6, al.ancla("izq", 0.3)[1]), (X0 + 6, RC[3]), (x_s[0], RC[3]), (x_s[0], ss.y)],
                "dep", "hallazgo", "SQL embebido (4)", (300, RC[3])))
# repositorios -> entidades de db.models y -> Session
nt, ae, lb, sb = C["notification"], C["alert_event"], C["laboratory"], C["subscription"]
x_ae = (max(arp.x, ae.x) + min(arp.x + arp.w, ae.x + ae.w)) / 2 + 12
F.append(Flecha([baja(arp, t_en(arp, x_ae)), (x_ae, ae.y)], "dep"))
x_sb = (max(srp.x, sb.x) + min(srp.x + srp.w, sb.x + sb.w)) / 2
F.append(Flecha([baja(srp, t_en(srp, x_sb)), (x_sb, sb.y)], "dep"))
F.append(Flecha([baja(nrp, 0.05), (baja(nrp, 0.05)[0], RC[0]), (nt.x + 0.6 * nt.w, RC[0]), (nt.x + 0.6 * nt.w, nt.y)], "dep"))
F.append(Flecha([baja(arp, 0.62), (baja(arp, 0.62)[0], RC[2]), (x_s[2], RC[2]), (x_s[2], ss.y)], "dep"))
F.append(Flecha([baja(srp, 0.97), (baja(srp, 0.97)[0], RC[0] + 3), (x_s[3], RC[0] + 3), (x_s[3], ss.y)], "dep"))
F.append(Flecha([baja(nrp, t_en(nrp, x_s[5])), (x_s[5], ss.y)], "dep"))
# asociaciones entre entidades
F.append(Flecha([ae.ancla("izq"), lb.ancla("der")], "assoc", mult=("*", "1")))
F.append(Flecha([nt.ancla("izq"), ae.ancla("der")], "assoc", mult=("*", "1")))
y_bajo = sb.y + sb.h + 5
F.append(Flecha([baja(sb, 0.5), (baja(sb, 0.5)[0], y_bajo), (baja(lb, 0.5)[0], y_bajo), baja(lb, 0.5)], "assoc", mult=("*", "1")))
# API y servicios -> dominio
st, rn, sk, msj, ml = C["streaks"], C["run"], C["streak"], C["messages"], M["m_mail"]
F.append(Flecha([sube(ra, 0.5), (sube(ra, 0.5)[0], API_Y + 34), (XD[0], API_Y + 34), (XD[0], st.ancla("izq", 0.3)[1]),
                 st.ancla("izq", 0.3)], "dep"))
F.append(Flecha([sube(al, 0.85), (sube(al, 0.85)[0], SA[0]), (XD[1], SA[0]), (XD[1], st.ancla("izq", 0.75)[1]),
                 st.ancla("izq", 0.75)], "dep"))
hueco_c1 = (M["m_streaks"].y + M["m_streaks"].h + M["m_messages"].y) / 2
F.append(Flecha([sube(ns, 0.9), (sube(ns, 0.9)[0], SA[1]), (XD[2], SA[1]), (XD[2], hueco_c1), (XG, hueco_c1),
                 (XG, ml.ancla("izq", 0.55)[1]), (ml.x, ml.ancla("izq", 0.55)[1])], "dep"))
F.append(Flecha([sube(ns, 0.75), (sube(ns, 0.75)[0], SA[2]), (XD[3], SA[2]), (XD[3], msj.ancla("izq", 0.25)[1]),
                 msj.ancla("izq", 0.25)], "dep"))
F.append(Flecha([sube(al, 0.65), (sube(al, 0.65)[0], SA[3]), (XD[0] - 2, SA[3]), (XD[0] - 2, sk.ancla("izq", 0.5)[1]),
                 sk.ancla("izq", 0.5)], "dep"))
F.append(Flecha([dp.ancla("der", 0.06), (XD[1] + 3, dp.ancla("der", 0.06)[1]), (XD[1] + 3, API_Y + 27),
                 (ml.x + ml.w * 0.55, API_Y + 27), (ml.x + ml.w * 0.55, ml.y + 13)], "dep"))
# dentro del dominio
F.append(Flecha([st.ancla("der", 0.5), (XG - 4, st.ancla("der", 0.5)[1]), (XG - 4, sk.ancla("der", 0.3)[1]), sk.ancla("der", 0.3)], "dep"))
F.append(Flecha([rn.ancla("der", 0.5), (XG - 8, rn.ancla("der", 0.5)[1]), (XG - 8, sk.ancla("der", 0.7)[1]), sk.ancla("der", 0.7)], "dep"))
F.append(Flecha([baja(msj, 0.5), (baja(msj, 0.5)[0], C["alert_message"].y)], "dep"))
smt, rcm, mlr, eml = C["smtp_mailer"], C["recording_mailer"], C["mailer"], C["email"]
F.append(Flecha([sube(smt, 0.75), (sube(smt, 0.75)[0], smt.y - 12), (mlr.x + 0.3 * mlr.w, smt.y - 12), baja(mlr, 0.3)], "real"))
F.append(Flecha([sube(rcm, 0.5), (sube(rcm, 0.5)[0], rcm.y - 16), (mlr.x + 0.75 * mlr.w, rcm.y - 16), baja(mlr, 0.75)], "real"))
F.append(Flecha([mlr.ancla("izq", 0.5), (eml.x + eml.w, mlr.ancla("izq", 0.5)[1])], "dep"))
sg = C["settings"]
F.append(Flecha([baja(smt, 0.4), (baja(smt, 0.4)[0], sg.y)], "dep", "hallazgo", "H-07",
                (baja(smt, 0.4)[0] + 18, (smt.y + smt.h + sg.y) / 2 + 3)))
ck = C["clock"]
F.append(Flecha([sube(C["system_clock"], 0.5), (sube(C["system_clock"], 0.5)[0], C["system_clock"].y - 12),
                 (ck.x + 0.3 * ck.w, C["system_clock"].y - 12), baja(ck, 0.3)], "real"))
F.append(Flecha([sube(C["fixed_clock"], 0.5), (sube(C["fixed_clock"], 0.5)[0], C["fixed_clock"].y - 12),
                 (ck.x + 0.75 * ck.w, C["fixed_clock"].y - 12), baja(ck, 0.75)], "real"))

L.leyenda += leyenda(L, PX + 4, PERS_Y + 14, ANCHO_DER - 8, ["hallazgo"], notas=[
    "Firmas sin el parámetro session ni los tipos de los parámetros; + público, − privado.",
    "NOM, Ce y Ca como en la Tabla 2. No se dibujan las dependencias hacia api.deps ni",
    "hacia módulos fuera del alcance (esquemas, labs_repo, readings_repo…); Ce las cuenta.",
])
salida = sys.argv[1] if len(sys.argv) > 1 else "e01a.svg"
open(salida, "w", encoding="utf-8").write(L.svg())
print(f"ok {salida} {L.ancho:.0f}x{L.alto:.0f}")
