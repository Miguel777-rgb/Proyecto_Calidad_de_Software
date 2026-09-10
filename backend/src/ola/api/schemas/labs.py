"""Esquemas del catalogo de laboratorios costeros (RF-04)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class LaboratoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    latitude: Decimal
    longitude: Decimal
    is_active: bool
