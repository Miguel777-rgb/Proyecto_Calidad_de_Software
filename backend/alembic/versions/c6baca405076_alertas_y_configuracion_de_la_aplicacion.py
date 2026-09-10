"""alertas y configuracion de la aplicacion

Revision ID: c6baca405076
Revises: 90a278285e3c
Create Date: 2026-09-10 17:16:42.065112
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c6baca405076"
down_revision: str | None = "90a278285e3c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "alert_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("laboratory_id", sa.Integer(), nullable=False),
        sa.Column("state", sa.Enum("warm", "cold", name="alert_state"), nullable=False),
        sa.Column("started_on", sa.Date(), nullable=False),
        sa.Column("ended_on", sa.Date(), nullable=False),
        sa.Column("streak_length", sa.Integer(), nullable=False),
        sa.Column("peak_anomaly_c", sa.Numeric(precision=7, scale=4), nullable=False),
        sa.Column("threshold_c", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column("min_streak_records", sa.Integer(), nullable=False),
        sa.Column("max_gap_days", sa.Integer(), nullable=False),
        sa.Column("is_open", sa.Boolean(), nullable=False),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["laboratory_id"], ["laboratories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "laboratory_id", "state", "started_on", name="uq_alert_lab_state_start"
        ),
    )
    op.create_index("ix_alert_open", "alert_events", ["is_open", "laboratory_id"], unique=False)
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=60), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("key"),
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_index("ix_alert_open", table_name="alert_events")
    op.drop_table("alert_events")
    # Alembic no elimina el tipo enum al soltar la tabla.
    sa.Enum(name="alert_state").drop(op.get_bind(), checkfirst=True)
