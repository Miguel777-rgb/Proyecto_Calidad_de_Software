"""Importacion del CSV de ATSM publicado por IMARPE (RF-08).

La importacion es manual: la ejecuta un administrador desde la aplicacion.
Es parcial y tolerante: las filas validas entran y las invalidas se reportan,
porque descartar 125 mil filas correctas por unas pocas erroneas dejaria el
sistema sin datos.
"""

from __future__ import annotations

import hashlib
import io
import time
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import BinaryIO

from sqlalchemy import Boolean, literal_column
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from ola.db.models import AnomalyReading, ImportRun, ImportStatus
from ola.domain.csv_parser import InvalidHeaderError, ParsedRow, RowError, parse_atsm
from ola.repositories import imports_repo, labs_repo

# Con lotes de este tamano, las 125 mil filas del dataset entran en pocos
# segundos. Fila por fila superaria el limite de 2 minutos de la SRS.
BATCH_SIZE = 5_000

# Solo se guarda una muestra de errores: un archivo mal formado podria
# generar decenas de miles y no aportarian mas informacion.
MAX_ERROR_SAMPLE = 50

READ_CHUNK = 64 * 1024


@dataclass
class ImportCounters:
    total: int = 0
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    rejected: int = 0
    errors: list[RowError] = field(default_factory=list)

    def add_error(self, error: RowError) -> None:
        self.rejected += 1
        if len(self.errors) < MAX_ERROR_SAMPLE:
            self.errors.append(error)


def _hash_and_size(stream: BinaryIO) -> tuple[str, int]:
    """Calcula sha256 y tamano sin cargar el archivo entero en memoria."""
    digest = hashlib.sha256()
    size = 0
    while chunk := stream.read(READ_CHUNK):
        digest.update(chunk)
        size += len(chunk)
    stream.seek(0)
    return digest.hexdigest(), size


def _flush(session: Session, batch: list[dict[str, object]], counters: ImportCounters) -> None:
    """Inserta o actualiza un lote y contabiliza el resultado.

    Solo actualiza cuando el valor cambio de verdad, para que reimportar el
    mismo archivo informe 'sin cambios' en lugar de miles de actualizaciones.
    """
    if not batch:
        return

    # Una misma pareja (laboratorio, fecha) repetida dentro del lote haria
    # fallar ON CONFLICT; se conserva la ultima aparicion.
    unicos: dict[tuple[int, object], dict[str, object]] = {}
    for fila in batch:
        unicos[(fila["laboratory_id"], fila["measured_on"])] = fila  # type: ignore[index]
    valores = list(unicos.values())
    counters.unchanged += len(batch) - len(valores)

    inserted_flag = literal_column("(xmax = 0)", Boolean).label("inserted")
    base = insert(AnomalyReading).values(valores)
    upsert = base.on_conflict_do_update(
        constraint="uq_reading_lab_date",
        set_={
            "anomaly_c": base.excluded.anomaly_c,
            "import_run_id": base.excluded.import_run_id,
        },
        where=AnomalyReading.anomaly_c.is_distinct_from(base.excluded.anomaly_c),
    ).returning(inserted_flag)

    # xmax vale 0 en las filas recien insertadas: distingue alta de correccion.
    resultados = session.execute(upsert).scalars().all()
    nuevas = sum(1 for es_nueva in resultados if es_nueva)
    counters.inserted += nuevas
    counters.updated += len(resultados) - nuevas
    counters.unchanged += len(valores) - len(resultados)
    batch.clear()


def _iter_lines(stream: BinaryIO) -> Iterator[str]:
    # utf-8-sig descarta la marca de orden de bytes con la que IMARPE publica
    # el archivo. Con utf-8 a secas, la primera columna se leeria mal.
    envoltorio = io.TextIOWrapper(stream, encoding="utf-8-sig", newline="")
    yield from envoltorio


def run_import(
    session: Session, *, filename: str, stream: BinaryIO, uploaded_by_id: int | None
) -> ImportRun:
    """Importa el CSV y devuelve el registro de auditoria de la operacion."""
    inicio = time.monotonic()
    sha256, byte_size = _hash_and_size(stream)

    run = imports_repo.create(
        session,
        filename=filename,
        byte_size=byte_size,
        sha256=sha256,
        uploaded_by_id=uploaded_by_id,
    )

    codigos = labs_repo.code_to_id(session)
    counters = ImportCounters()
    batch: list[dict[str, object]] = []

    try:
        for resultado in parse_atsm(_iter_lines(stream), known_codes=codigos.keys()):
            counters.total += 1
            if isinstance(resultado, RowError):
                counters.add_error(resultado)
                continue

            assert isinstance(resultado, ParsedRow)
            batch.append(
                {
                    "laboratory_id": codigos[resultado.laboratory_code],
                    "measured_on": resultado.measured_on,
                    "anomaly_c": resultado.anomaly_c,
                    "import_run_id": run.id,
                }
            )
            if len(batch) >= BATCH_SIZE:
                _flush(session, batch, counters)
        _flush(session, batch, counters)

    except InvalidHeaderError as exc:
        # La cabecera invalida invalida el archivo completo: no se guarda nada,
        # pero si queda constancia del intento.
        session.rollback()
        run = imports_repo.create(
            session,
            filename=filename,
            byte_size=byte_size,
            sha256=sha256,
            uploaded_by_id=uploaded_by_id,
        )
        run.status = ImportStatus.FAILED
        run.error_message = str(exc)
        run.finished_at = datetime.now(UTC)
        run.duration_ms = int((time.monotonic() - inicio) * 1000)
        session.commit()
        return run

    run.status = ImportStatus.COMPLETED
    run.rows_total = counters.total
    run.rows_inserted = counters.inserted
    run.rows_updated = counters.updated
    run.rows_unchanged = counters.unchanged
    run.rows_rejected = counters.rejected
    run.error_sample = [
        {"line": e.line, "reason": e.reason, "content": e.content[:200]} for e in counters.errors
    ] or None
    run.finished_at = datetime.now(UTC)
    run.duration_ms = int((time.monotonic() - inicio) * 1000)
    session.commit()
    return run
