"""catalogo de laboratorios mediciones e importaciones

Revision ID: 90a278285e3c
Revises: 689d3ec0529c
Create Date: 2026-09-10 16:54:44.298789
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from ola.seeds.laboratories import LABORATORIES

revision: str = "90a278285e3c"
down_revision: str | None = "689d3ec0529c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "laboratories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_laboratories_code"), "laboratories", ["code"], unique=True)
    op.create_table(
        "import_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("byte_size", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("uploaded_by_id", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("running", "completed", "failed", name="import_status"),
            nullable=False,
        ),
        sa.Column("rows_total", sa.Integer(), nullable=False),
        sa.Column("rows_inserted", sa.Integer(), nullable=False),
        sa.Column("rows_updated", sa.Integer(), nullable=False),
        sa.Column("rows_unchanged", sa.Integer(), nullable=False),
        sa.Column("rows_rejected", sa.Integer(), nullable=False),
        sa.Column("error_sample", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "anomaly_readings",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("laboratory_id", sa.Integer(), nullable=False),
        sa.Column("measured_on", sa.Date(), nullable=False),
        sa.Column("anomaly_c", sa.Numeric(precision=7, scale=4), nullable=False),
        sa.Column("import_run_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["import_run_id"], ["import_runs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["laboratory_id"], ["laboratories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("laboratory_id", "measured_on", name="uq_reading_lab_date"),
    )
    op.create_index(
        "ix_reading_date_lab",
        "anomaly_readings",
        ["measured_on", "laboratory_id"],
        unique=False,
    )

    _seed_laboratories()


def _seed_laboratories() -> None:
    """Carga las 10 zonas del RF-04.

    El CSV de IMARPE no trae coordenadas, asi que el catalogo se siembra aqui.
    Los laboratorios no se crean al importar: una errata en el archivo generaria
    una zona fantasma y el mapa dejaria de tener 10.
    """
    tabla = sa.table(
        "laboratories",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("latitude", sa.Numeric),
        sa.column("longitude", sa.Numeric),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        tabla,
        [
            {
                "code": lab.code,
                "name": lab.name,
                "latitude": lab.latitude,
                "longitude": lab.longitude,
                "is_active": True,
            }
            for lab in LABORATORIES
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_reading_date_lab", table_name="anomaly_readings")
    op.drop_table("anomaly_readings")
    op.drop_table("import_runs")
    op.drop_index(op.f("ix_laboratories_code"), table_name="laboratories")
    op.drop_table("laboratories")
    # Alembic no elimina el tipo enum al soltar la tabla.
    sa.Enum(name="import_status").drop(op.get_bind(), checkfirst=True)
