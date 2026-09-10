"""Estado termico vigente de cada zona (RF-01, RF-04)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from ola.db.models import AlertEvent, Laboratory
from ola.domain.classification import average_recent, classify
from ola.domain.freshness import is_stale
from ola.domain.types import ThermalState
from ola.repositories import alerts_repo, labs_repo, readings_repo
from ola.services.settings_service import EffectiveSettings


@dataclass(frozen=True)
class ZoneStatus:
    laboratory: Laboratory
    state: ThermalState
    average_c: Decimal | None
    last_anomaly_c: Decimal | None
    last_measured_on: date | None
    days_since_last: int | None
    is_stale: bool
    open_alert: AlertEvent | None


@dataclass(frozen=True)
class SystemStatus:
    reference_date: date | None
    zones: list[ZoneStatus]


def get_status(
    session: Session, config: EffectiveSettings, *, as_of: date | None = None
) -> SystemStatus:
    """Estado de las 10 zonas a la fecha de referencia.

    La referencia es la fecha del dato mas reciente del sistema, no el reloj
    del servidor. El parametro `as_of` permite fijarla para consultar el estado
    en un momento pasado y para que las pruebas sean deterministas.
    """
    referencia = as_of or readings_repo.reference_date(session)
    laboratorios = labs_repo.list_all(session)

    if referencia is None:
        return SystemStatus(
            reference_date=None,
            zones=[
                ZoneStatus(lab, ThermalState.NO_DATA, None, None, None, None, True, None)
                for lab in laboratorios
            ],
        )

    ventana_desde = referencia - timedelta(days=config.map_window_days - 1)
    recientes = readings_repo.series_by_lab(session, since=ventana_desde, until=referencia)
    ultimas = readings_repo.last_reading_by_lab(session)
    abiertas = alerts_repo.open_events(session)

    zonas: list[ZoneStatus] = []
    for lab in laboratorios:
        ultima = ultimas.get(lab.id)
        ultima_fecha = ultima.measured_on if ultima else None
        obsoleta = is_stale(
            ultima_fecha, reference_date=referencia, window_days=config.freshness_days
        )

        promedio = average_recent(
            recientes.get(lab.id, []),
            reference_date=referencia,
            window_days=config.map_window_days,
        )

        # Una zona sin datos recientes no se clasifica: la SRS exige avisar
        # cuando el dato no corresponde al periodo actual.
        if obsoleta or promedio is None:
            estado = ThermalState.NO_DATA
        else:
            estado = classify(promedio, config.threshold_c)

        zonas.append(
            ZoneStatus(
                laboratory=lab,
                state=estado,
                average_c=promedio,
                last_anomaly_c=ultima.anomaly_c if ultima else None,
                last_measured_on=ultima_fecha,
                days_since_last=(referencia - ultima_fecha).days if ultima_fecha else None,
                is_stale=obsoleta,
                open_alert=None if obsoleta else abiertas.get(lab.id),
            )
        )

    return SystemStatus(reference_date=referencia, zones=zonas)
