"""Agrupacion temporal de las series (RF-05, RF-06)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from ola.domain.series import (
    Resolution,
    SeriesPoint,
    bucket_start,
    choose_resolution,
    fill_gaps,
    iter_buckets,
    next_bucket,
)

D = Decimal


class TestChooseResolution:
    @pytest.mark.parametrize(
        ("desde", "hasta", "esperada"),
        [
            (date(2026, 5, 1), date(2026, 7, 31), Resolution.DAILY),
            (date(2025, 8, 1), date(2026, 7, 31), Resolution.DAILY),
            (date(2024, 1, 1), date(2026, 7, 31), Resolution.WEEKLY),
            (date(2022, 1, 1), date(2026, 7, 31), Resolution.WEEKLY),
            (date(1970, 11, 1), date(2026, 7, 31), Resolution.MONTHLY),
        ],
    )
    def test_elige_segun_la_amplitud_del_rango(self, desde, hasta, esperada):
        assert choose_resolution(desde, hasta) is esperada

    def test_un_solo_dia_es_resolucion_diaria(self):
        assert choose_resolution(date(2026, 7, 31), date(2026, 7, 31)) is Resolution.DAILY

    def test_el_historico_completo_nunca_devuelve_dato_diario(self):
        # 56 anos en diario serian mas de 20 mil puntos: el grafico se atasca.
        resolucion = choose_resolution(date(1970, 11, 1), date(2026, 7, 31))
        assert resolucion is Resolution.MONTHLY

    def test_limita_los_puntos_que_llegan_al_navegador(self):
        # Con el rango mas amplio posible, la serie mensual cabe holgadamente
        # dentro del limite de 3 segundos que fija la SRS.
        desde, hasta = date(1970, 11, 1), date(2026, 7, 31)
        periodos = iter_buckets(desde, hasta, choose_resolution(desde, hasta))
        assert len(periodos) < 1000


class TestBucketStart:
    def test_en_diario_cada_dia_es_su_propio_periodo(self):
        assert bucket_start(date(2026, 7, 31), Resolution.DAILY) == date(2026, 7, 31)

    @pytest.mark.parametrize(
        "dia",
        [date(2026, 7, 27), date(2026, 7, 29), date(2026, 8, 2)],
    )
    def test_en_semanal_todos_los_dias_de_una_semana_comparten_periodo(self, dia):
        # 2026-07-27 es lunes; 2026-08-02, domingo.
        assert bucket_start(dia, Resolution.WEEKLY) == date(2026, 7, 27)

    def test_en_mensual_el_periodo_es_el_primero_del_mes(self):
        assert bucket_start(date(2026, 7, 31), Resolution.MONTHLY) == date(2026, 7, 1)


class TestNextBucket:
    def test_avanza_un_dia(self):
        assert next_bucket(date(2026, 7, 31), Resolution.DAILY) == date(2026, 8, 1)

    def test_avanza_una_semana(self):
        assert next_bucket(date(2026, 7, 27), Resolution.WEEKLY) == date(2026, 8, 3)

    def test_avanza_un_mes(self):
        assert next_bucket(date(2026, 7, 1), Resolution.MONTHLY) == date(2026, 8, 1)

    def test_cambia_de_ano_al_pasar_diciembre(self):
        assert next_bucket(date(2026, 12, 1), Resolution.MONTHLY) == date(2027, 1, 1)

    def test_cruza_el_cambio_de_mes_en_semanal(self):
        assert next_bucket(date(2026, 12, 28), Resolution.WEEKLY) == date(2027, 1, 4)


class TestIterBuckets:
    def test_incluye_el_primero_y_el_ultimo(self):
        periodos = iter_buckets(date(2026, 7, 1), date(2026, 7, 5), Resolution.DAILY)
        assert periodos[0] == date(2026, 7, 1)
        assert periodos[-1] == date(2026, 7, 5)
        assert len(periodos) == 5

    def test_un_rango_de_un_solo_dia_devuelve_un_periodo(self):
        assert iter_buckets(date(2026, 7, 1), date(2026, 7, 1), Resolution.DAILY) == [
            date(2026, 7, 1)
        ]

    def test_agrupa_correctamente_un_ano_en_meses(self):
        periodos = iter_buckets(date(2026, 1, 15), date(2026, 12, 20), Resolution.MONTHLY)
        assert len(periodos) == 12


class TestFillGaps:
    """Rellenar con None es lo que hace que el grafico corte la linea en lugar
    de inventar una tendencia entre dos puntos lejanos.
    """

    def test_los_periodos_sin_dato_quedan_en_none(self):
        serie = fill_gaps(
            [
                SeriesPoint(date(2026, 7, 1), D("1.0"), 1),
                SeriesPoint(date(2026, 7, 4), D("2.0"), 1),
            ],
            since=date(2026, 7, 1),
            until=date(2026, 7, 4),
            resolution=Resolution.DAILY,
        )
        assert [p.anomaly_c for p in serie] == [D("1.0"), None, None, D("2.0")]

    def test_conserva_los_valores_medidos(self):
        serie = fill_gaps(
            [SeriesPoint(date(2026, 7, 2), D("1.5"), 3)],
            since=date(2026, 7, 1),
            until=date(2026, 7, 3),
            resolution=Resolution.DAILY,
        )
        assert serie[1].anomaly_c == D("1.5")
        assert serie[1].samples == 3

    def test_una_serie_vacia_da_un_rango_completo_de_nulos(self):
        serie = fill_gaps(
            [], since=date(2026, 7, 1), until=date(2026, 7, 3), resolution=Resolution.DAILY
        )
        assert len(serie) == 3
        assert all(p.anomaly_c is None for p in serie)

    def test_un_hueco_largo_queda_marcado_periodo_a_periodo(self):
        # Caso real: HUACHO tiene un hueco de 1127 dias.
        serie = fill_gaps(
            [
                SeriesPoint(date(2020, 1, 1), D("1.0"), 1),
                SeriesPoint(date(2023, 1, 1), D("2.0"), 1),
            ],
            since=date(2020, 1, 1),
            until=date(2023, 1, 31),
            resolution=Resolution.MONTHLY,
        )
        sin_dato = [p for p in serie if p.anomaly_c is None]
        assert len(sin_dato) == 35

    def test_el_resultado_siempre_esta_ordenado_por_fecha(self):
        serie = fill_gaps(
            [
                SeriesPoint(date(2026, 7, 3), D("1.0"), 1),
                SeriesPoint(date(2026, 7, 1), D("2.0"), 1),
            ],
            since=date(2026, 7, 1),
            until=date(2026, 7, 3),
            resolution=Resolution.DAILY,
        )
        assert [p.period for p in serie] == sorted(p.period for p in serie)
