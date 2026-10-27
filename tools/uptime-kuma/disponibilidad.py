"""Disponibilidad del backend a partir de los chequeos de Uptime Kuma.

Solo cuentan los chequeos con respuesta, arriba o abajo. Los pendientes y
los de mantenimiento no suman ni restan. El tiempo con el equipo apagado
tampoco cuenta: sin chequeos no hay medicion, y el informe muestra el
periodo realmente cubierto para que nadie lea el porcentaje como 24/7.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime

ABAJO = 0
ARRIBA = 1


@dataclass(frozen=True)
class Latido:
    momento: datetime
    estado: int
    mensaje: str = ""

    @classmethod
    def desde_uptime_kuma(cls, crudo: Mapping[str, object]) -> Latido:
        """Acepta el latido tal como lo entrega uptime-kuma-api.

        Segun la version, `status` llega como entero o como enumeracion y
        `time` como texto o como fecha; se normalizan los dos.
        """
        estado = crudo["status"]
        momento = crudo["time"]
        return cls(
            momento=momento if isinstance(momento, datetime) else datetime.fromisoformat(str(momento)),
            estado=int(getattr(estado, "value", estado)),  # type: ignore[call-overload]
            mensaje=str(crudo.get("msg") or ""),
        )


@dataclass(frozen=True)
class Caida:
    inicio: datetime
    #: Primer chequeo que volvio a responder; None si seguia caido al final.
    fin: datetime | None
    chequeos: int
    mensaje: str


@dataclass(frozen=True)
class Resumen:
    arriba: int
    abajo: int
    desde: datetime | None
    hasta: datetime | None
    caidas: list[Caida]

    @property
    def chequeos(self) -> int:
        return self.arriba + self.abajo

    @property
    def porcentaje(self) -> float | None:
        return None if self.chequeos == 0 else 100 * self.arriba / self.chequeos


def resumir(latidos: Iterable[Latido]) -> Resumen:
    medidos = sorted(
        (latido for latido in latidos if latido.estado in (ABAJO, ARRIBA)),
        key=lambda latido: latido.momento,
    )

    caidas: list[Caida] = []
    abierta: Latido | None = None
    seguidos = 0
    for latido in medidos:
        if latido.estado == ABAJO:
            if abierta is None:
                abierta, seguidos = latido, 0
            seguidos += 1
        elif abierta is not None:
            caidas.append(Caida(abierta.momento, latido.momento, seguidos, abierta.mensaje))
            abierta = None
    if abierta is not None:
        caidas.append(Caida(abierta.momento, None, seguidos, abierta.mensaje))

    return Resumen(
        arriba=sum(1 for latido in medidos if latido.estado == ARRIBA),
        abajo=sum(1 for latido in medidos if latido.estado == ABAJO),
        desde=medidos[0].momento if medidos else None,
        hasta=medidos[-1].momento if medidos else None,
        caidas=caidas,
    )


def formatear(resumen: Resumen, *, horas: int) -> str:
    """Texto en Markdown listo para pegar en docs/calidad.md."""
    if resumen.porcentaje is None or resumen.desde is None or resumen.hasta is None:
        return f"Sin chequeos en las últimas {horas} horas: el entorno no estuvo levantado."

    lineas = [
        f"- Periodo con chequeos: {resumen.desde:%Y-%m-%d %H:%M} a {resumen.hasta:%Y-%m-%d %H:%M} (UTC)",
        f"- Chequeos: {resumen.chequeos} ({resumen.arriba} correctos, {resumen.abajo} fallidos)",
        f"- Disponibilidad: {resumen.porcentaje:.2f} %",
        f"- Caídas: {len(resumen.caidas)}",
    ]
    for caida in resumen.caidas:
        fin = f"{caida.fin:%Y-%m-%d %H:%M}" if caida.fin else "sin recuperar al cierre"
        lineas.append(
            f"  - {caida.inicio:%Y-%m-%d %H:%M} → {fin}: {caida.chequeos} chequeos. {caida.mensaje}"
        )
    return "\n".join(lineas)
