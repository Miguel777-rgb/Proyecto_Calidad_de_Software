"""Acceso a datos de los episodios de anomalia sostenida (RF-01)."""

from __future__ import annotations

from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import Session, joinedload

from ola.db.models import AlertEvent


def list_events(
    session: Session,
    *,
    laboratory_id: int | None = None,
    only_open: bool = False,
    limit: int = 100,
) -> list[AlertEvent]:
    consulta = select(AlertEvent).options(joinedload(AlertEvent.laboratory))
    if laboratory_id is not None:
        consulta = consulta.where(AlertEvent.laboratory_id == laboratory_id)
    if only_open:
        consulta = consulta.where(AlertEvent.is_open.is_(True))
    consulta = consulta.order_by(desc(AlertEvent.started_on)).limit(limit)
    return list(session.scalars(consulta))


def open_events(session: Session) -> dict[int, AlertEvent]:
    """Episodios vigentes, indexados por laboratorio."""
    eventos = session.scalars(select(AlertEvent).where(AlertEvent.is_open.is_(True)))
    return {evento.laboratory_id: evento for evento in eventos}


def delete_all(session: Session) -> int:
    """Borra el historico de episodios.

    Lo usa la reevaluacion: al cambiar los umbrales, los episodios detectados
    con los parametros anteriores dejan de ser validos y se recalculan.
    """
    total = session.scalar(select(func.count()).select_from(AlertEvent)) or 0
    session.execute(delete(AlertEvent))
    return total
