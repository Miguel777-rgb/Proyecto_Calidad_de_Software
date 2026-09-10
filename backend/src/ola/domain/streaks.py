"""Deteccion de tendencia termica sostenida (RF-01).

Una racha es una sucesion de mediciones consecutivas del mismo estado
anomalo (calido o frio). Se interrumpe cuando el estado cambia o cuando
faltan mas dias de los tolerados entre dos mediciones.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass

from ola.domain.classification import classify
from ola.domain.types import Reading, Streak, StreakConfig, ThermalState


@dataclass
class _Run:
    state: ThermalState
    readings: list[Reading]

    def to_streak(self) -> Streak:
        valores = [r.anomaly_c for r in self.readings]
        pico = max(valores) if self.state is ThermalState.WARM else min(valores)
        return Streak(
            state=self.state,
            started_on=self.readings[0].measured_on,
            ended_on=self.readings[-1].measured_on,
            length=len(self.readings),
            peak_anomaly_c=pico,
        )


def _runs(readings: Sequence[Reading], config: StreakConfig) -> Iterator[_Run]:
    actual: _Run | None = None

    for lectura in readings:
        estado = classify(lectura.anomaly_c, config.threshold_c)

        if not estado.is_anomalous:
            if actual is not None:
                yield actual
                actual = None
            continue

        if actual is not None:
            cambio_de_estado = estado is not actual.state
            faltantes = (lectura.measured_on - actual.readings[-1].measured_on).days - 1
            if cambio_de_estado or faltantes > config.max_gap_days:
                yield actual
                actual = None

        if actual is None:
            actual = _Run(state=estado, readings=[lectura])
        else:
            actual.readings.append(lectura)

    if actual is not None:
        yield actual


def detect_streaks(readings: Iterable[Reading], config: StreakConfig | None = None) -> list[Streak]:
    """Devuelve los episodios que alcanzan la longitud minima configurada.

    Las mediciones se ordenan por fecha antes de recorrerlas, para no depender
    del orden en que lleguen desde la base.
    """
    config = config or StreakConfig()
    ordenadas = sorted(readings, key=lambda r: r.measured_on)
    return [
        run.to_streak()
        for run in _runs(ordenadas, config)
        if len(run.readings) >= config.min_records
    ]
