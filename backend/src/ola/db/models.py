"""Modelos SQLAlchemy. Las tablas se agregan a partir de la Fase 1."""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base declarativa comun. Alembic lee su metadata para autogenerar."""
