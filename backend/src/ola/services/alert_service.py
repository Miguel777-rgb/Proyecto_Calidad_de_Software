"""Deteccion y registro de episodios de anomalia sostenida (RF-01).

La evaluacion recorre TODO el historico de cada zona, de modo que quede
constancia de cada episodio desde 1970. Solo los episodios que llegan hasta
la ultima medicion de su zona quedan abiertos, que son los que representan
una tendencia vigente y los unicos que notifican (RF-03).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import and_, delete, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from ola.db.models import AlertEvent, AlertState
from ola.domain.freshness import is_stale
from ola.domain.streaks import detect_streaks
from ola.domain.types import Streak, ThermalState
from ola.repositories import alerts_repo, labs_repo, readings_repo
from ola.services.settings_service import EffectiveSettings


@dataclass(frozen=True)
class EvaluationSummary:
    reference_date: date | None
    laboratories_evaluated: int
    events_total: int
    events_open: int
    events_removed: int


def _to_alert_state(state: ThermalState) -> AlertState:
    return AlertState.WARM if state is ThermalState.WARM else AlertState.COLD


def _sync_lab_events(
    session: Session,
    laboratory_id: int,
    streaks: list[Streak],
    *,
    open_streak: Streak | None,
    config: EffectiveSettings,
) -> int:
    """Deja en la base exactamente los episodios recibidos para esa zona.

    Se usa upsert sobre (laboratorio, estado, fecha de inicio) en lugar de
    borrar y recrear, para que el identificador del episodio se mantenga entre
    evaluaciones. De eso depende que RF-03 no reenvie la misma alerta.
    """
    claves = {(_to_alert_state(s.state), s.started_on) for s in streaks}

    condicion = AlertEvent.laboratory_id == laboratory_id
    if claves:
        vigentes = [
            and_(AlertEvent.state == estado, AlertEvent.started_on == inicio)
            for estado, inicio in claves
        ]
        condicion = and_(condicion, ~or_(*vigentes))
    obsoletos = list(session.scalars(select(AlertEvent.id).where(condicion)))
    if obsoletos:
        session.execute(delete(AlertEvent).where(AlertEvent.id.in_(obsoletos)))

    if not streaks:
        return len(obsoletos)

    filas = [
        {
            "laboratory_id": laboratory_id,
            "state": _to_alert_state(s.state),
            "started_on": s.started_on,
            "ended_on": s.ended_on,
            "streak_length": s.length,
            "peak_anomaly_c": s.peak_anomaly_c,
            "threshold_c": config.threshold_c,
            "min_streak_records": config.min_streak_records,
            "max_gap_days": config.max_gap_days,
            "is_open": s is open_streak,
        }
        for s in streaks
    ]

    base = insert(AlertEvent).values(filas)
    session.execute(
        base.on_conflict_do_update(
            constraint="uq_alert_lab_state_start",
            set_={
                "ended_on": base.excluded.ended_on,
                "streak_length": base.excluded.streak_length,
                "peak_anomaly_c": base.excluded.peak_anomaly_c,
                "threshold_c": base.excluded.threshold_c,
                "min_streak_records": base.excluded.min_streak_records,
                "max_gap_days": base.excluded.max_gap_days,
                "is_open": base.excluded.is_open,
            },
        )
    )
    return len(obsoletos)


def evaluate(session: Session, config: EffectiveSettings) -> EvaluationSummary:
    """Recalcula los episodios de todas las zonas."""
    referencia = readings_repo.reference_date(session)
    if referencia is None:
        # Sin mediciones no hay nada que evaluar; se limpia lo que hubiera.
        eliminados = alerts_repo.delete_all(session)
        session.commit()
        return EvaluationSummary(None, 0, 0, 0, eliminados)

    ultimas = readings_repo.last_measured_on_by_lab(session)
    laboratorios = labs_repo.list_all(session)

    total = abiertos = eliminados = 0
    for lab in laboratorios:
        serie = readings_repo.series(session, lab.id)
        if not serie:
            eliminados += _sync_lab_events(session, lab.id, [], open_streak=None, config=config)
            continue

        rachas = detect_streaks(serie, config.streak_config)

        # Un episodio esta vigente si llega hasta la ultima medicion de su zona
        # y esa medicion sigue siendo reciente. Asi MATARANI, cuya serie acaba
        # en 2016, nunca queda en alerta.
        ultima = ultimas.get(lab.id)
        zona_obsoleta = is_stale(
            ultima, reference_date=referencia, window_days=config.freshness_days
        )
        vigente = (
            rachas[-1]
            if rachas and not zona_obsoleta and ultima is not None and rachas[-1].ended_on == ultima
            else None
        )

        eliminados += _sync_lab_events(session, lab.id, rachas, open_streak=vigente, config=config)
        total += len(rachas)
        abiertos += 1 if vigente is not None else 0

    session.commit()
    return EvaluationSummary(
        reference_date=referencia,
        laboratories_evaluated=len(laboratorios),
        events_total=total,
        events_open=abiertos,
        events_removed=eliminados,
    )
