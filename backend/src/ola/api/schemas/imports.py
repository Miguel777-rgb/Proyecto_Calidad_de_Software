"""Esquemas del historial de importaciones (RF-08)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict

from ola.db.models import ImportStatus

if TYPE_CHECKING:
    from ola.db.models import ImportRun


class ImportErrorOut(BaseModel):
    line: int
    reason: str
    content: str


class ImportRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    byte_size: int
    sha256: str
    status: ImportStatus
    rows_total: int
    rows_inserted: int
    rows_updated: int
    rows_unchanged: int
    rows_rejected: int
    error_sample: list[ImportErrorOut] | None = None
    error_message: str | None = None
    duration_ms: int | None = None
    started_at: datetime
    finished_at: datetime | None = None
    uploaded_by_email: str | None = None

    @classmethod
    def from_run(cls, run: ImportRun) -> ImportRunOut:
        modelo = cls.model_validate(run)
        modelo.uploaded_by_email = run.uploaded_by.email if run.uploaded_by else None
        return modelo
