"""Esquemas de las series historicas (RF-05, RF-06)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from ola.api.schemas.labs import LaboratoryOut
from ola.domain.series import Resolution
from ola.services.series_service import SeriesResult


class SeriesPointOut(BaseModel):
    period: date
    # `null` marca un periodo sin mediciones: el grafico corta la linea ahi
    # en lugar de unir dos puntos lejanos con una recta inventada.
    anomaly_c: Decimal | None
    samples: int


class LabSeriesOut(BaseModel):
    laboratory: LaboratoryOut
    points: list[SeriesPointOut]


class SeriesOut(BaseModel):
    since: date
    until: date
    resolution: Resolution
    series: list[LabSeriesOut]

    @classmethod
    def from_result(cls, resultado: SeriesResult) -> SeriesOut:
        return cls(
            since=resultado.since,
            until=resultado.until,
            resolution=resultado.resolution,
            series=[
                LabSeriesOut(
                    laboratory=LaboratoryOut.model_validate(s.laboratory),
                    points=[
                        SeriesPointOut(period=p.period, anomaly_c=p.anomaly_c, samples=p.samples)
                        for p in s.points
                    ],
                )
                for s in resultado.series
            ],
        )
