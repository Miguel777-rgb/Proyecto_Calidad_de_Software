"""Textos de los avisos de alerta (RF-03).

Son funciones puras: reciben datos y devuelven asunto y cuerpo. Asi el
contenido se revisa en una prueba sin levantar un servidor de correo.

El tono evita jerga tecnica: la SRS describe al destinatario como un pescador
artesanal que puede tener alfabetizacion digital limitada.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

ESTADOS = {"warm": "cálida", "cold": "fría"}
ESTADOS_SUSTANTIVO = {"warm": "calentamiento", "cold": "enfriamiento"}

ATRIBUCION = (
    "Fuente: Anomalía de la Temperatura Superficial del Mar (ATSM) de los laboratorios "
    "costeros del IMARPE — IMARPE / PRODUCE."
)

DESCARGO = (
    "OLA complementa los boletines de IMARPE y no los reemplaza. No predice eventos "
    "El Niño ni La Niña, que son competencia del ENFEN."
)


@dataclass(frozen=True)
class AlertMessage:
    subject: str
    body: str


def _pie(zona: str) -> str:
    return (
        f"\n\nRecibes este aviso porque te suscribiste a la zona de {zona} en OLA.\n"
        f"Puedes darte de baja desde tu cuenta.\n\n{DESCARGO}\n\n{ATRIBUCION}\n"
    )


def alert_opened(
    *,
    zona: str,
    state: str,
    started_on: date,
    streak_length: int,
    peak_anomaly_c: Decimal,
) -> AlertMessage:
    adjetivo = ESTADOS.get(state, state)
    sustantivo = ESTADOS_SUSTANTIVO.get(state, state)
    # El dato guarda cuatro decimales; en el correo sobran.
    pico = f"{peak_anomaly_c:.2f}"
    return AlertMessage(
        subject=f"OLA: alerta {adjetivo} en {zona}",
        body=(
            f"La zona de {zona} entró en alerta {adjetivo}.\n\n"
            f"El mar viene registrando un {sustantivo} sostenido desde el "
            f"{started_on.isoformat()}, con {streak_length} mediciones seguidas fuera de lo "
            f"normal. El valor más extremo hasta ahora es de {pico} °C respecto al "
            f"promedio habitual de la zona.\n\n"
            "Te avisaremos de nuevo cuando la situación vuelva a la normalidad." + _pie(zona)
        ),
    )


def alert_closed(*, zona: str, state: str, started_on: date, ended_on: date) -> AlertMessage:
    adjetivo = ESTADOS.get(state, state)
    dias = (ended_on - started_on).days + 1
    return AlertMessage(
        subject=f"OLA: terminó la alerta {adjetivo} en {zona}",
        body=(
            f"La zona de {zona} volvió a valores normales.\n\n"
            f"La alerta {adjetivo} había comenzado el {started_on.isoformat()} y la última "
            f"medición fuera de lo normal fue del {ended_on.isoformat()}, un periodo de "
            f"{dias} días." + _pie(zona)
        ),
    )
