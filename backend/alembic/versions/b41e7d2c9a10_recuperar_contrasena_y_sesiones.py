"""recuperar contrasena y cerrar sesiones al cambiarla

Revision ID: b41e7d2c9a10
Revises: 9c022526c786
Create Date: 2026-09-27 22:10:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b41e7d2c9a10"
down_revision: str | None = "9c022526c786"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_table(
        "password_reset_codes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_password_reset_codes_user_id"),
        "password_reset_codes",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_password_reset_codes_user_id"), table_name="password_reset_codes")
    op.drop_table("password_reset_codes")
    op.drop_column("users", "password_changed_at")
