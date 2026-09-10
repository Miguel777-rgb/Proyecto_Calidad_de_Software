"""Acceso a datos del historial de importaciones (RF-08)."""

from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from ola.db.models import ImportRun


def create(
    session: Session, *, filename: str, byte_size: int, sha256: str, uploaded_by_id: int | None
) -> ImportRun:
    run = ImportRun(
        filename=filename, byte_size=byte_size, sha256=sha256, uploaded_by_id=uploaded_by_id
    )
    session.add(run)
    session.flush()
    return run


def get(session: Session, run_id: int) -> ImportRun | None:
    return session.scalar(
        select(ImportRun).options(joinedload(ImportRun.uploaded_by)).where(ImportRun.id == run_id)
    )


def list_recent(session: Session, *, limit: int = 20) -> list[ImportRun]:
    return list(
        session.scalars(
            select(ImportRun)
            .options(joinedload(ImportRun.uploaded_by))
            .order_by(desc(ImportRun.started_at))
            .limit(limit)
        )
    )
