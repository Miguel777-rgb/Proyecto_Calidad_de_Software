"""E-06a. Diagrama de clases del diseño propuesto del módulo «Alertas y avisos»."""

from __future__ import annotations

import sys

from contenido import (
    alert_service, canales, deps, dispatcher, dominio_comun, entidades_compactas, notices,
    notification_service_despues, notifications_repo_despues, repos, routers_alerts, routers_subs,
)
from leyenda import leyenda
from uml_svg import Carril, Flecha, Lienzo, Marco

L = Lienzo(0, 0, "Diseño propuesto del módulo «Alertas y avisos» — diagrama de clases",
           "d5c054f + refactorizacion_avisos.patch · E-06a · Verde: nuevo; ámbar: modificado; rosa: hallazgos "
           "pendientes (H-xx). Los atributos de las entidades están en la Figura 2b.")
C, M, F = L.cajas, L.marcos, L.flechas
for c in (routers_alerts(True), routers_subs(), deps(True), *alert_service(), notification_service_despues(),
          *dispatcher(), *canales(), *repos(True), *notifications_repo_despues(), *dominio_comun(), *notices(),
          *entidades_compactas(True)):
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
al, es, ns = C["alert_service"], C["evaluation_summary"], C["notification_service"]
arp, srp, nrp, sq, ss = C["alerts_repo"], C["subscriptions_repo"], C["notifications_repo"], C["sql_store"], C["session"]
dsp, sto, ssum, dmod = C["dispatcher"], C["store"], C["send_summary"], C["dispatcher_mod"]
chn, eml_c, inapp, reg, dup, unk, cmod = (C[i] for i in ("channel", "email_channel", "inapp_channel", "registry",
                                                          "dup_error", "unk_error", "channels_mod"))

# --------------------------------------------------------------- API
TOP = API_Y + 48
pos("routers_alerts", 58, TOP)
pos("routers_subs", ra.x + ra.w + 20, TOP)
pos("deps", rs.x + rs.w + 40, TOP)
api_fondo = max(ra.y + ra.h, rs.y + rs.h, dp.y + dp.h) + 14

# --------------------------------------------------------------- Servicios (dos filas)
SERV_Y = api_fondo + 12
FILA_A = SERV_Y + 66 + 22
pos("alert_service", 58, FILA_A)
pos("evaluation_summary", 58, al.y + al.h + 10)
L.marco(Marco("m_alert", "services.alert_service", ["alert_service", "evaluation_summary"]))
F1R = M["m_alert"].x + M["m_alert"].w
CORR = [rs.x + 8, rs.x + 18, rs.x + 28, rs.x + 38]
assert F1R < CORR[0] - 4, (F1R, CORR)
F2L = CORR[3] + 22
pos("notification_service", F2L + 9, FILA_A)
L.marco(Marco("m_notif", "services.notification_service", ["notification_service"], estado="modificado"))
F3L = M["m_notif"].x + M["m_notif"].w + 28
pos("dispatcher", F3L + 9, FILA_A)
pos("send_summary", dsp.x + dsp.w + 12, FILA_A)
pos("store", F3L + 9, dsp.y + dsp.h + 14)
pos("dispatcher_mod", sto.x + sto.w + 12, sto.y + sto.h - dmod.h)
L.marco(Marco("m_disp", "services.notification_dispatcher", ["dispatcher", "send_summary", "store", "dispatcher_mod"],
              estado="nuevo", nota="NOM 5 · Ce 3 · Ca 1"))
fila_b = max(M["m_notif"].y + M["m_notif"].h, M["m_disp"].y + M["m_disp"].h) + 30 + 22
pos("registry", F2L + 9, fila_b)
pos("channel", reg.x + reg.w + 30, fila_b)
pos("dup_error", chn.x + chn.w + 24, fila_b)
pos("unk_error", dup.x, dup.y + dup.h + 10)
fila_b2 = max(reg.y + reg.h, chn.y + chn.h) + 30
pos("channels_mod", F2L + 9, fila_b2 + 8)
pos("email_channel", chn.x - 20, fila_b2)
pos("inapp_channel", eml_c.x + eml_c.w + 14, fila_b2)
L.marco(Marco("m_chan", "services.channels", ["registry", "channel", "dup_error", "unk_error", "channels_mod",
                                               "email_channel", "inapp_channel"], estado="nuevo",
              nota="NOM 13 · Ce 2 · Ca 3"))
serv_fondo = max(M["m_alert"].y + M["m_alert"].h, M["m_chan"].y + M["m_chan"].h) + 12

# --------------------------------------------------------------- Repositorios
REPO_Y = serv_fondo + 12
CAJAS_REPO = REPO_Y + 54
pos("alerts_repo", 58, CAJAS_REPO)
pos("subscriptions_repo", CORR[1] - 10, CAJAS_REPO)
pos("notifications_repo", srp.x + srp.w + 31, CAJAS_REPO)
pos("sql_store", nrp.x + nrp.w + 14, CAJAS_REPO)
L.marco(Marco("m_nrepo", "repositories.notifications_repo", ["notifications_repo", "sql_store"], estado="modificado",
              nota="NOM 11 · Ce 2 · Ca 3"))
repo_fondo = max(arp.y + arp.h, srp.y + srp.h, M["m_nrepo"].y + M["m_nrepo"].h) + 14

ANCHO_IZQ = max(dp.x + dp.w, M["m_disp"].x + M["m_disp"].w, M["m_chan"].x + M["m_chan"].w,
                M["m_nrepo"].x + M["m_nrepo"].w) + 30 - X0
DER_IZQ = X0 + ANCHO_IZQ

# --------------------------------------------------------------- Persistencia
PERS_Y = repo_fondo + 12
CAJAS_PERS = PERS_Y + 50 + 22
ex = 80
for i in ("laboratory", "alert_event", "notification", "subscription"):
    pos(i, ex, CAJAS_PERS)
    ex += C[i].w + 46
L.marco(Marco("m_models", "db.models", ["laboratory", "alert_event", "notification", "subscription"],
              estado="modificado", nota="12 clases · NOM 9 · detalle en la Figura 2b", nota_fuera=True))
pos("session", M["m_nrepo"].x + 30, PERS_Y + 56)
pers_fondo = max(M["m_models"].y + M["m_models"].h, ss.y + ss.h) + 14

L.carriles += [
    Carril("API", X0, API_Y, ANCHO_IZQ, api_fondo - API_Y),
    Carril("Servicios", X0, SERV_Y, ANCHO_IZQ, serv_fondo - SERV_Y),
    Carril("Repositorios", X0, REPO_Y, ANCHO_IZQ, repo_fondo - REPO_Y),
    Carril("Persistencia", X0, PERS_Y, ANCHO_IZQ, pers_fondo - PERS_Y),
]

# --------------------------------------------------------------- Dominio e infraestructura
PX = DER_IZQ + 18
C1 = PX + 36
n1 = API_Y + 40 + 22
x = C1 + 9
for i in ("n_channel", "n_kind", "n_status"):
    pos(i, x, n1)
    x += C[i].w + 12
n2 = max(C[i].y + C[i].h for i in ("n_channel", "n_kind", "n_status")) + 14
x = C1 + 9
for i in ("pending_row", "alert_facts", "recipient"):
    pos(i, x, n2)
    x += C[i].w + 12
n3 = max(C[i].y + C[i].h for i in ("pending_row", "alert_facts", "recipient")) + 14
pos("outbound", C1 + 9, n3)
pos("notices_mod", C["outbound"].x + C["outbound"].w + 12, n3)
L.marco(Marco("m_notices", "domain.notices", ["n_channel", "n_kind", "n_status", "pending_row", "alert_facts",
                                              "recipient", "outbound", "notices_mod"], estado="nuevo",
              nota="NOM 4 · Ce 1 · Ca 5"))
msj_y = M["m_notices"].y + M["m_notices"].h + 30 + 22
pos("messages", C1 + 9, msj_y)
pos("alert_message", C["messages"].x + C["messages"].w + 12, msj_y)
L.marco(Marco("m_messages", "domain.messages", ["messages", "alert_message"]))
stk_y = M["m_messages"].y + M["m_messages"].h + 30 + 22
pos("streaks", C1 + 9, stk_y)
pos("run", C["streaks"].x + C["streaks"].w + 12, stk_y)
L.marco(Marco("m_streaks", "domain.streaks", ["streaks", "run"]))
C1R = max(M[m].x + M[m].w for m in ("m_notices", "m_messages", "m_streaks"))
C2 = C1R + 30
mail_y = API_Y + 40 + 22
pos("email", C2 + 9, mail_y)
pos("mailer", C["email"].x + C["email"].w + 26, mail_y)
fila2 = mail_y + max(C["email"].h, C["mailer"].h) + 28
pos("smtp_mailer", C2 + 9, fila2)
pos("recording_mailer", C["smtp_mailer"].x + C["smtp_mailer"].w + 14, fila2)
L.marco(Marco("m_mail", "mail", ["email", "mailer", "smtp_mailer", "recording_mailer"], nota="NOM 5 · Ce 1 · Ca 3"))
pos("settings", C2 + 9, M["m_mail"].y + M["m_mail"].h + 22)
clk_y = C["settings"].y + C["settings"].h + 30 + 22
pos("clock", C2 + 60, clk_y)
pos("system_clock", C2 + 9, clk_y + C["clock"].h + 28)
pos("fixed_clock", C["system_clock"].x + C["system_clock"].w + 14, clk_y + C["clock"].h + 28)
L.marco(Marco("m_clock", "clock", ["clock", "system_clock", "fixed_clock"], nota="NOM 4 · Ce 0 · Ca 2"))
pos("streak", C2 + 9, M["m_clock"].y + M["m_clock"].h + 30 + 22)
L.marco(Marco("m_types", "domain.types (solo Streak)", ["streak"]))
C2R = max(M[m].x + M[m].w for m in ("m_mail", "m_clock", "m_types"))
ANCHO_DER = C2R + 18 - PX
fondo_der = max(repo_fondo, M["m_streaks"].y + M["m_streaks"].h + 14, M["m_types"].y + M["m_types"].h + 14)
L.carriles.append(Carril("Dominio e infraestructura", PX, API_Y, ANCHO_DER, fondo_der - API_Y))
L.ancho = PX + ANCHO_DER + 16

# --------------------------------------------------------------- pistas
RA = [SERV_Y + 12, SERV_Y + 19, SERV_Y + 26]
SA = [SERV_Y + 34, SERV_Y + 40, SERV_Y + 46, SERV_Y + 52, SERV_Y + 58]
RB = [REPO_Y + 10, REPO_Y + 16, REPO_Y + 22, REPO_Y + 28, REPO_Y + 34, REPO_Y + 40]
RC = [PERS_Y + 12, PERS_Y + 19, PERS_Y + 26, PERS_Y + 33]
XD = [DER_IZQ + 3 + 5 * k for k in range(7)]   # pasillo entre regiones
XG = C1R + 15                                  # pasillo entre columnas del dominio
x_hueco_23 = M["m_notif"].x + M["m_notif"].w + 14
y_entre = (max(M["m_notif"].y + M["m_notif"].h, M["m_disp"].y + M["m_disp"].h) + M["m_chan"].y) / 2
x_der = DER_IZQ - 12
mm, mn, mc, mk, mml = M["m_models"], M["m_notices"], M["m_chan"], M["m_clock"], M["m_mail"]

# --------------------------------------------------------------- API
F.append(Flecha([baja(ra, 0.3), (baja(ra, 0.3)[0], al.y)], "dep"))
x_rs_ns = ns.x + 0.45 * ns.w
F.append(Flecha([baja(rs, t_en(rs, x_rs_ns)), (x_rs_ns, ns.y)], "dep"))
F.append(Flecha([baja(ra, 0.78), (baja(ra, 0.78)[0], RA[0]), (ns.x + 0.12 * ns.w, RA[0]), (ns.x + 0.12 * ns.w, ns.y)], "dep"))
xi = X0 + 14
F.append(Flecha([ra.ancla("izq", 0.85), (xi, ra.ancla("izq", 0.85)[1]), (xi, arp.ancla("izq", 0.3)[1]), arp.ancla("izq", 0.3)],
                "dep", "hallazgo", "H-10", (xi + 14, (api_fondo + REPO_Y) / 2)))
F.append(Flecha([baja(rs, t_en(rs, CORR[1])), (CORR[1], srp.y)], "dep", "hallazgo"))
xg1, xg2 = srp.x + srp.w + 6, srp.x + srp.w + 12
F.append(Flecha([baja(rs, t_en(rs, CORR[2])), (CORR[2], RB[3]), (xg1, RB[3]), (xg1, nrp.y + 0.2 * nrp.h), nrp.ancla("izq", 0.2)],
                "dep", "hallazgo", "H-10", (CORR[2] + 1, (serv_fondo + SERV_Y) / 2)))
F.append(Flecha([baja(ra, 0.95), (baja(ra, 0.95)[0], RA[1]), (CORR[3], RA[1]), (CORR[3], RB[4]),
                 (xg2, RB[4]), (xg2, nrp.y + 0.3 * nrp.h), nrp.ancla("izq", 0.3)], "dep", "hallazgo"))
st, sk, msj = C["streaks"], C["streak"], C["messages"]
F.append(Flecha([sube(ra, 0.5), (sube(ra, 0.5)[0], API_Y + 34), (XD[0], API_Y + 34), (XD[0], st.ancla("izq", 0.3)[1]),
                 st.ancla("izq", 0.3)], "dep"))
F.append(Flecha([dp.ancla("der", 0.06), (DER_IZQ - 6, dp.ancla("der", 0.06)[1]), (DER_IZQ - 6, API_Y + 27),
                 (mml.x + mml.w * 0.55, API_Y + 27), (mml.x + mml.w * 0.55, mml.y + 13)], "dep"))
F.append(Flecha([baja(dp, 0.25), (baja(dp, 0.25)[0], RA[2]), (x_hueco_23, RA[2]), (x_hueco_23, y_entre),
                 (mc.x + mc.w * 0.62, y_entre), (mc.x + mc.w * 0.62, mc.y + 13)], "dep", "nuevo"))

# --------------------------------------------------------------- servicios -> repositorios y persistencia
F.append(Flecha([al.ancla("der", 0.55), (CORR[0], al.ancla("der", 0.55)[1]), (CORR[0], RB[0]),
                 (arp.x + 0.8 * arp.w, RB[0]), (arp.x + 0.8 * arp.w, arp.y)], "dep"))
x_s = [ss.x + ss.w * t for t in (0.1, 0.25, 0.4, 0.55, 0.7, 0.85)]
F.append(Flecha([al.ancla("izq", 0.3), (X0 + 6, al.ancla("izq", 0.3)[1]), (X0 + 6, RC[3]), (x_s[0], RC[3]), (x_s[0], ss.y)],
                "dep", "hallazgo", "SQL embebido (4)", (300, RC[3])))
xn = F2L - 8
F.append(Flecha([ns.ancla("izq", 0.7), (xn, ns.ancla("izq", 0.7)[1]), (xn, RB[1]), (arp.x + 0.92 * arp.w, RB[1]),
                 (arp.x + 0.92 * arp.w, arp.y)], "dep", "nuevo"))
F.append(Flecha([ns.ancla("izq", 0.85), (xn + 4, ns.ancla("izq", 0.85)[1]), (xn + 4, RB[2]),
                 (srp.x + 0.85 * srp.w, RB[2]), (srp.x + 0.85 * srp.w, srp.y)], "dep"))
F.append(Flecha([baja(ns, 0.96), (baja(ns, 0.96)[0], y_entre - 6), (x_der, y_entre - 6), (x_der, RB[5]),
                 (nrp.x + 0.95 * nrp.w, RB[5]), (nrp.x + 0.95 * nrp.w, nrp.y)], "dep"))
F.append(Flecha([ns.ancla("der", 0.3), (dsp.x, ns.ancla("der", 0.3)[1])], "dep", "nuevo"))
F.append(Flecha([baja(ns, 0.8), (baja(ns, 0.8)[0], mc.y + 13)], "dep", "nuevo"))
# despachador
F.append(Flecha([baja(dsp, 0.3), (baja(dsp, 0.3)[0], sto.y)], "assoc", "nuevo"))
F.append(Flecha([dsp.ancla("der", 0.3), (ssum.x, dsp.ancla("der", 0.3)[1])], "dep", "nuevo"))
x_marco3 = F3L + 4
F.append(Flecha([dsp.ancla("izq", 0.8), (x_marco3, dsp.ancla("izq", 0.8)[1]), (x_marco3, y_entre + 6),
                 (reg.x + reg.w * 0.85, y_entre + 6), (reg.x + reg.w * 0.85, reg.y)], "assoc", "nuevo"))
# canales
F.append(Flecha([reg.ancla("der", 0.3), (chn.x, reg.ancla("der", 0.3)[1])], "assoc", "nuevo", mult=(None, "*")))
F.append(Flecha([sube(eml_c, 0.5), (sube(eml_c, 0.5)[0], eml_c.y - 12), (chn.x + chn.w * 0.35, eml_c.y - 12),
                 baja(chn, 0.35)], "real", "nuevo"))
F.append(Flecha([sube(inapp, 0.5), (sube(inapp, 0.5)[0], inapp.y - 12), (chn.x + chn.w * 0.75, inapp.y - 12),
                 baja(chn, 0.75)], "real", "nuevo"))
y_sto = sto.y + sto.h + 5
F.append(Flecha([sube(sq, 0.8), (sube(sq, 0.8)[0], RB[0] - 4), (x_der + 6, RB[0] - 4), (x_der + 6, y_sto),
                 (sto.x + sto.w * 0.6, y_sto), baja(sto, 0.6)], "real", "nuevo"))
# repositorios -> entidades y Session
nt, ae, lb, sb = C["notification"], C["alert_event"], C["laboratory"], C["subscription"]
x_ae = (max(arp.x, ae.x) + min(arp.x + arp.w, ae.x + ae.w)) / 2 + 12
F.append(Flecha([baja(arp, t_en(arp, x_ae)), (x_ae, ae.y)], "dep"))
x_sb = (max(srp.x, sb.x) + min(srp.x + srp.w, sb.x + sb.w)) / 2
F.append(Flecha([baja(srp, t_en(srp, x_sb)), (x_sb, sb.y)], "dep"))
F.append(Flecha([baja(nrp, 0.05), (baja(nrp, 0.05)[0], RC[0]), (nt.x + 0.6 * nt.w, RC[0]), (nt.x + 0.6 * nt.w, nt.y)], "dep"))
F.append(Flecha([baja(arp, 0.62), (baja(arp, 0.62)[0], RC[2]), (x_s[2], RC[2]), (x_s[2], ss.y)], "dep"))
F.append(Flecha([baja(srp, 0.97), (baja(srp, 0.97)[0], RC[1]), (x_s[3], RC[1]), (x_s[3], ss.y)], "dep"))
F.append(Flecha([baja(sq, t_en(sq, x_s[5])), (x_s[5], ss.y)], "dep"))
F.append(Flecha([nt.ancla("izq"), ae.ancla("der")], "assoc", mult=("*", "1")))
F.append(Flecha([ae.ancla("izq"), lb.ancla("der")], "assoc", mult=("*", "1")))
y_bajo = sb.y + sb.h + 5
F.append(Flecha([baja(sb, 0.5), (baja(sb, 0.5)[0], y_bajo), (baja(lb, 0.5)[0], y_bajo), baja(lb, 0.5)], "assoc", mult=("*", "1")))

# --------------------------------------------------------------- hacia el dominio (panel derecho)
y_notices = mn.y + 40
F.append(Flecha([sube(ns, 0.85), (sube(ns, 0.85)[0], SA[0]), (XD[1], SA[0]), (XD[1], y_notices), (mn.x, y_notices)],
                "dep", "nuevo"))
x_sum = ssum.x + ssum.w + 5
F.append(Flecha([sube(sto, 0.92), (sube(sto, 0.92)[0], sto.y - 6), (x_sum, sto.y - 6),
                 (x_sum, SA[0]), (XD[1], SA[0])], "tramo-nuevo"))
F.append(Flecha([chn.ancla("der", 0.2), (dup.x - 10, chn.ancla("der", 0.2)[1]), (dup.x - 10, y_entre + 12),
                 (XD[1], y_entre + 12), (XD[1], SA[0])], "tramo-nuevo"))
F.append(Flecha([sq.ancla("der", 0.3), (XD[1], sq.ancla("der", 0.3)[1]), (XD[1], y_entre + 12)], "tramo-nuevo"))
F.append(Flecha([(mm.x + mm.w - 30, mm.y + mm.h), (mm.x + mm.w - 30, pers_fondo - 5), (XD[1], pers_fondo - 5),
                 (XD[1], sq.ancla("der", 0.3)[1])], "tramo-nuevo"))
y_reloj = mk.y + mk.h * 0.5
y_bajo_notices = M["m_notices"].y + M["m_notices"].h + 12
F.append(Flecha([sube(ns, 0.95), (sube(ns, 0.95)[0], SA[1]), (XD[2], SA[1]), (XD[2], y_bajo_notices),
                 (XG, y_bajo_notices), (XG, y_reloj), (mk.x, y_reloj)], "dep", "nuevo"))
y_dsp = ssum.y + ssum.h + 6
F.append(Flecha([(dsp.x + dsp.w, y_dsp), (x_sum + 4, y_dsp), (x_sum + 4, SA[1]), (XD[2], SA[1])], "tramo-nuevo"))
y_mail = mml.y + mml.h * 0.55
F.append(Flecha([sube(ns, 0.7), (sube(ns, 0.7)[0], SA[2]), (XD[3], SA[2]), (XD[3], y_bajo_notices + 6),
                 (XG + 6, y_bajo_notices + 6), (XG + 6, y_mail), (mml.x, y_mail)], "dep"))
F.append(Flecha([baja(eml_c, 0.6), (baja(eml_c, 0.6)[0], mc.y + mc.h + 6), (XD[3], mc.y + mc.h + 6),
                 (XD[3], y_bajo_notices + 6)], "tramo-nuevo"))
F.append(Flecha([sube(al, 0.85), (sube(al, 0.85)[0], SA[3]), (XD[4], SA[3]), (XD[4], st.ancla("izq", 0.7)[1]),
                 st.ancla("izq", 0.7)], "dep"))
F.append(Flecha([sube(al, 0.65), (sube(al, 0.65)[0], SA[4]), (XD[5], SA[4]), (XD[5], fondo_der - 6),
                 (XG + 12, fondo_der - 6), (XG + 12, sk.ancla("izq", 0.5)[1]), sk.ancla("izq", 0.5)], "dep"))
# dentro del dominio
nmod = C["notices_mod"]
F.append(Flecha([baja(nmod, 0.5), (baja(nmod, 0.5)[0], M["m_messages"].y + 13)], "dep", "nuevo"))
F.append(Flecha([st.ancla("der", 0.5), (XG - 4, st.ancla("der", 0.5)[1]), (XG - 4, sk.ancla("izq", 0.3)[1]), sk.ancla("izq", 0.3)], "dep"))
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

y_ley = max(pers_fondo, fondo_der) + 22
L.leyenda += leyenda(L, X0 + 4, y_ley, L.ancho - 40, ["hallazgo", "nuevo", "modificado"], flecha_nueva=True, notas=[
    "Firmas sin el parámetro session ni los tipos de los parámetros; + público, − privado. NOM, Ce y Ca como en la Tabla 4. "
    "No se dibujan las dependencias hacia api.deps ni hacia módulos fuera del alcance; Ce las cuenta. "
    "Las flechas hacia un mismo paquete comparten el último tramo.",
])
L.alto = y_ley + 16 * 4
salida = sys.argv[1] if len(sys.argv) > 1 else "e06a.svg"
open(salida, "w", encoding="utf-8").write(L.svg())
print(f"ok {salida} {L.ancho:.0f}x{L.alto:.0f}")
