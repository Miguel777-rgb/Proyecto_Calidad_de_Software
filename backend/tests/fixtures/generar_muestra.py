"""Genera `sample_atsm.csv`, el dataset reducido que usan las pruebas.

El archivo se versiona ya generado; este script existe para poder regenerarlo
si hace falta ajustar algun caso. Ejecutar desde `backend/`:

    python tests/fixtures/generar_muestra.py

Casos construidos a proposito, con la fecha de referencia en 2026-07-31 y los
parametros por defecto (umbral 0.5 C, racha minima 5 registros, hueco maximo
2 dias, frescura 7 dias):

| Laboratorio | Caso                                              | Esperado          |
|-------------|---------------------------------------------------|-------------------|
| CALLAO      | 6 registros calidos seguidos hasta el 31-07        | Alerta calida     |
| PISCO       | 6 registros frios seguidos hasta el 31-07          | Alerta fria       |
| SAN JOSE    | exactamente 5 calidos seguidos                     | Alerta (limite)   |
| HUACHO      | exactamente 4 calidos seguidos                     | Sin alerta        |
| CHIMBOTE    | 3 calidos, hueco de 4 dias, 1 calido               | Sin alerta        |
| CHICAMA     | 6 calidos con un hueco de 2 dias en medio          | Alerta (tolerado) |
| TUMBES      | neutro                                             | Sin alerta        |
| PAITA       | neutro, ultimo dato hace 10 dias                   | Sin datos recientes |
| ILO         | valores justo en el umbral (0.5 y -0.5)            | Neutro            |
| MATARANI    | serie que termina en 2016-12-31                    | Sin datos recientes |
"""

from __future__ import annotations

import csv
from datetime import date, timedelta
from pathlib import Path

FIN = date(2026, 7, 31)
DESTINO = Path(__file__).parent / "sample_atsm.csv"


def dias(desde: date, hasta: date) -> list[date]:
    return [desde + timedelta(days=i) for i in range((hasta - desde).days + 1)]


def serie(lab: str, fechas: list[date], valores: list[str]) -> list[tuple[str, str, str]]:
    assert len(fechas) == len(valores), f"{lab}: {len(fechas)} fechas y {len(valores)} valores"
    return [(f.isoformat(), lab, v) for f, v in zip(fechas, valores, strict=True)]


def neutros(n: int) -> list[str]:
    """Valores dentro del rango neutro, variados pero deterministas."""
    base = ["0.10", "-0.20", "0.30", "-0.10", "0.05", "-0.35", "0.25"]
    return [base[i % len(base)] for i in range(n)]


filas: list[tuple[str, str, str]] = []

# --- CALLAO: 40 dias neutros y 6 calidos seguidos al final -> alerta calida
fechas = dias(FIN - timedelta(days=45), FIN)
filas += serie(
    "CALLAO", fechas, [*neutros(len(fechas) - 6), "1.2", "1.4", "1.1", "1.6", "1.3", "1.5"]
)

# --- PISCO: mismo patron pero frio -> alerta fria
fechas = dias(FIN - timedelta(days=45), FIN)
filas += serie(
    "PISCO", fechas, [*neutros(len(fechas) - 6), "-1.1", "-1.3", "-0.9", "-1.5", "-1.2", "-1.4"]
)

# --- SAN JOSE: exactamente 5 calidos seguidos -> alerta (caso limite)
fechas = dias(FIN - timedelta(days=45), FIN)
filas += serie("SAN JOSE", fechas, [*neutros(len(fechas) - 5), "0.9", "1.0", "0.8", "1.1", "0.7"])

# --- HUACHO: exactamente 4 calidos seguidos -> sin alerta (caso limite)
fechas = dias(FIN - timedelta(days=45), FIN)
filas += serie("HUACHO", fechas, [*neutros(len(fechas) - 4), "0.9", "1.0", "0.8", "1.1"])

# --- CHIMBOTE: 3 calidos, hueco de 4 dias faltantes, 1 calido -> sin alerta
previas = dias(FIN - timedelta(days=45), FIN - timedelta(days=8))
filas += serie("CHIMBOTE", previas, neutros(len(previas)))
filas += serie(
    "CHIMBOTE",
    [FIN - timedelta(days=7), FIN - timedelta(days=6), FIN - timedelta(days=5), FIN],
    ["1.2", "1.3", "1.1", "1.4"],
)

# --- CHICAMA: 6 calidos con un hueco de 2 dias faltantes -> alerta (se tolera)
previas = dias(FIN - timedelta(days=45), FIN - timedelta(days=9))
filas += serie("CHICAMA", previas, neutros(len(previas)))
calidas = [
    FIN - timedelta(days=8),
    FIN - timedelta(days=7),
    FIN - timedelta(days=6),
    # faltan los dias 5 y 4
    FIN - timedelta(days=3),
    FIN - timedelta(days=2),
    FIN - timedelta(days=1),
    FIN,
]
filas += serie("CHICAMA", calidas, ["1.1", "1.2", "1.3", "1.4", "1.2", "1.1", "1.3"])

# --- TUMBES: neutro de principio a fin
fechas = dias(FIN - timedelta(days=45), FIN)
filas += serie("TUMBES", fechas, neutros(len(fechas)))

# --- PAITA: neutro, pero su ultimo dato es de hace 10 dias -> sin datos recientes
fechas = dias(FIN - timedelta(days=45), FIN - timedelta(days=10))
filas += serie("PAITA", fechas, neutros(len(fechas)))

# --- ILO: valores exactamente en el umbral -> deben leerse como neutros
fechas = dias(FIN - timedelta(days=9), FIN)
filas += serie(
    "ILO",
    fechas,
    ["0.5", "-0.5", "0.5", "-0.5", "0.5", "-0.5", "0.5", "-0.5", "0.5", "-0.5"],
)

# --- MATARANI: descontinuado, su serie termina en 2016
fin_matarani = date(2016, 12, 31)
fechas = dias(fin_matarani - timedelta(days=29), fin_matarani)
filas += serie("MATARANI", fechas, neutros(len(fechas)))

filas.sort(key=lambda f: (f[1], f[0]))

with DESTINO.open("w", encoding="utf-8-sig", newline="") as archivo:
    escritor = csv.writer(archivo)
    escritor.writerow(["FECHA_MEDICION", "LABORATORIO_COSTERO", "ANOMALIA_TEMPERATURA"])
    escritor.writerows(filas)

print(f"{DESTINO.name}: {len(filas)} filas")
