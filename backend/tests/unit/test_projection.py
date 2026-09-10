"""Proyeccion de tendencia a corto plazo (RF-02).

Se prueban los dos metodos por separado y, sobre todo, el contraste entre
ellos: la regresion proyecta la tendencia y la media ponderada el nivel
reciente. Que difieran es informativo, no un fallo.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest

from ola.domain.projection import (
    DEFAULT_HORIZON,
    MIN_RECORDS,
    Confidence,
    NotEnoughDataError,
    ProjectionMethod,
    assess_confidence,
    linear_regression,
    weighted_moving_average,
)
from ola.domain.types import Reading, ThermalState

D = Decimal
INICIO = date(2026, 7, 1)


def diaria(*valores: str, desde: date = INICIO) -> list[Reading]:
    return [Reading(desde + timedelta(days=i), D(v)) for i, v in enumerate(valores)]


def creciente(n: int, inicio: float, paso: float) -> list[Reading]:
    return [Reading(INICIO + timedelta(days=i), D(str(inicio + paso * i))) for i in range(n)]


class TestRegresionLineal:
    def test_sigue_una_tendencia_ascendente_conocida(self):
        # Serie perfectamente lineal: sube 0.1 por dia desde 1.0.
        serie = creciente(10, 1.0, 0.1)
        proyeccion = linear_regression(serie, horizon_days=3)

        # El ultimo dato es 1.9 (dia 9); tres dias despues deberia dar 2.2.
        assert proyeccion.points[-1].anomaly_c == pytest.approx(D("2.2"), abs=D("0.01"))

    def test_sigue_una_tendencia_descendente(self):
        proyeccion = linear_regression(creciente(10, 2.0, -0.1), horizon_days=3)
        assert proyeccion.points[-1].anomaly_c < D("1.1")

    def test_una_serie_plana_se_proyecta_plana(self):
        proyeccion = linear_regression(diaria(*["1.5"] * 10), horizon_days=5)
        assert all(p.anomaly_c == pytest.approx(D("1.5"), abs=D("0.01")) for p in proyeccion.points)

    def test_devuelve_un_punto_por_dia_del_horizonte(self):
        for horizonte in (3, 5, 7):
            proyeccion = linear_regression(creciente(10, 1.0, 0.1), horizon_days=horizonte)
            assert len(proyeccion.points) == horizonte

    def test_las_fechas_siguen_a_la_ultima_medicion(self):
        serie = creciente(5, 1.0, 0.1)
        proyeccion = linear_regression(serie, horizon_days=3)
        ultima = serie[-1].measured_on
        assert [p.projected_on for p in proyeccion.points] == [
            ultima + timedelta(days=1),
            ultima + timedelta(days=2),
            ultima + timedelta(days=3),
        ]

    def test_los_huecos_pesan_en_la_pendiente(self):
        # Se usa la fecha real, no la posicion: dos mediciones separadas por
        # una semana no representan la misma subida diaria que dos seguidas.
        seguidas = [Reading(INICIO, D("1.0")), Reading(INICIO + timedelta(days=1), D("2.0"))]
        separadas = [Reading(INICIO, D("1.0")), Reading(INICIO + timedelta(days=10), D("2.0"))]
        tercero = [Reading(INICIO - timedelta(days=1), D("0.9"))]

        rapida = linear_regression(tercero + seguidas, horizon_days=3)
        lenta = linear_regression(tercero + separadas, horizon_days=3)
        assert rapida.final_value > lenta.final_value

    def test_clasifica_el_valor_final_proyectado(self):
        assert linear_regression(diaria(*["1.5"] * 5)).final_state is ThermalState.WARM
        assert linear_regression(diaria(*["-1.5"] * 5)).final_state is ThermalState.COLD
        assert linear_regression(diaria(*["0.1"] * 5)).final_state is ThermalState.NEUTRAL

    def test_solo_usa_la_ventana_indicada(self):
        # Valores antiguos muy distintos no deben arrastrar la proyeccion.
        antiguos = diaria(*["-5.0"] * 20)
        recientes = diaria(*["1.0"] * 10, desde=INICIO + timedelta(days=20))
        proyeccion = linear_regression(antiguos + recientes, window=10, horizon_days=3)
        assert proyeccion.final_value > D("0.5")

    def test_no_depende_del_orden_de_llegada(self):
        serie = creciente(10, 1.0, 0.1)
        assert linear_regression(serie).final_value == linear_regression(
            list(reversed(serie))
        ).final_value

    def test_varias_mediciones_del_mismo_dia_no_revientan(self):
        # Sin pendiente estimable, el modelo debe devolver un valor, no fallar.
        serie = [Reading(INICIO, D("1.0")), Reading(INICIO, D("1.2")), Reading(INICIO, D("1.4"))]
        assert linear_regression(serie, horizon_days=3).points


class TestMediaMovilPonderada:
    def test_da_mas_peso_a_lo_reciente(self):
        # Media simple = 2.0; con pesos crecientes debe acercarse mas a 3.0.
        proyeccion = weighted_moving_average(diaria("1.0", "2.0", "3.0"))
        assert proyeccion.final_value > D("2.0")

    def test_una_serie_plana_da_el_mismo_valor(self):
        proyeccion = weighted_moving_average(diaria(*["1.5"] * 10))
        assert proyeccion.final_value == pytest.approx(D("1.5"), abs=D("0.01"))

    def test_proyecta_plano_hacia_adelante(self):
        # Proyecta el NIVEL reciente, no la tendencia: todos los dias iguales.
        proyeccion = weighted_moving_average(creciente(10, 1.0, 0.1), horizon_days=5)
        valores = {p.anomaly_c for p in proyeccion.points}
        assert len(valores) == 1

    def test_resiste_un_dia_atipico_mejor_que_la_regresion(self):
        # Nueve dias estables y un pico al final.
        serie = diaria(*["1.0"] * 9, "6.0")
        ponderada = weighted_moving_average(serie, horizon_days=5)
        regresion = linear_regression(serie, horizon_days=5)
        assert ponderada.final_value < regresion.final_value

    def test_clasifica_el_valor_proyectado(self):
        assert weighted_moving_average(diaria(*["-1.5"] * 5)).final_state is ThermalState.COLD

    def test_solo_usa_la_ventana_indicada(self):
        antiguos = diaria(*["-5.0"] * 20)
        recientes = diaria(*["1.0"] * 10, desde=INICIO + timedelta(days=20))
        proyeccion = weighted_moving_average(antiguos + recientes, window=10)
        assert proyeccion.final_value == pytest.approx(D("1.0"), abs=D("0.01"))


class TestComparacionEntreMetodos:
    """El valor de mostrar los dos esta en el contraste."""

    def test_ante_una_serie_plana_ambos_coinciden(self):
        serie = diaria(*["1.5"] * 15)
        regresion = linear_regression(serie, horizon_days=5)
        ponderada = weighted_moving_average(serie, horizon_days=5)
        assert regresion.final_value == pytest.approx(ponderada.final_value, abs=D("0.05"))

    def test_ante_una_tendencia_la_regresion_se_adelanta(self):
        serie = creciente(20, 1.0, 0.1)
        regresion = linear_regression(serie, horizon_days=7)
        ponderada = weighted_moving_average(serie, horizon_days=7)
        # La regresion sigue subiendo; la ponderada se queda en el nivel medio.
        assert regresion.final_value > ponderada.final_value

    def test_cada_metodo_se_identifica(self):
        serie = diaria(*["1.0"] * 5)
        assert linear_regression(serie).method is ProjectionMethod.LINEAR
        assert weighted_moving_average(serie).method is ProjectionMethod.WEIGHTED


class TestDatosInsuficientes:
    @pytest.mark.parametrize("metodo", [linear_regression, weighted_moving_average])
    def test_ambos_metodos_exigen_un_minimo_de_mediciones(self, metodo):
        with pytest.raises(NotEnoughDataError):
            metodo(diaria(*["1.0"] * (MIN_RECORDS - 1)))

    @pytest.mark.parametrize("metodo", [linear_regression, weighted_moving_average])
    def test_una_serie_vacia_se_rechaza(self, metodo):
        with pytest.raises(NotEnoughDataError):
            metodo([])

    @pytest.mark.parametrize("metodo", [linear_regression, weighted_moving_average])
    def test_el_minimo_justo_si_alcanza(self, metodo):
        assert metodo(diaria(*["1.0"] * MIN_RECORDS)).points


class TestConfianza:
    """Se proyecta aunque los datos sean pobres, pero hay que advertirlo: una
    estimacion con apariencia de valida es peor que ninguna.
    """

    REF = date(2026, 7, 31)

    def _serie_reciente(self, n: int) -> list[Reading]:
        return [Reading(self.REF - timedelta(days=i), D("1.0")) for i in range(n)]

    def test_una_serie_densa_y_al_dia_da_confianza_alta(self):
        confianza = assess_confidence(self._serie_reciente(28), reference_date=self.REF, window=30)
        assert confianza is Confidence.HIGH

    def test_una_serie_con_muchos_huecos_baja_la_confianza(self):
        confianza = assess_confidence(self._serie_reciente(16), reference_date=self.REF, window=30)
        assert confianza is Confidence.MEDIUM

    def test_una_serie_muy_escasa_da_confianza_baja(self):
        confianza = assess_confidence(self._serie_reciente(5), reference_date=self.REF, window=30)
        assert confianza is Confidence.LOW

    def test_una_zona_descontinuada_da_confianza_baja(self):
        # MATARANI: serie densa, pero de hace nueve anos.
        antigua = [Reading(date(2016, 12, 31) - timedelta(days=i), D("1.0")) for i in range(30)]
        confianza = assess_confidence(antigua, reference_date=self.REF, window=30)
        assert confianza is Confidence.LOW

    def test_sin_mediciones_la_confianza_es_baja(self):
        assert assess_confidence([], reference_date=self.REF) is Confidence.LOW

    def test_un_retraso_dentro_de_la_ventana_no_penaliza(self):
        serie = [Reading(self.REF - timedelta(days=i + 3), D("1.0")) for i in range(28)]
        confianza = assess_confidence(
            serie, reference_date=self.REF, window=30, freshness_days=7
        )
        assert confianza is Confidence.HIGH


def test_el_horizonte_por_defecto_esta_dentro_del_rango_de_la_srs():
    # La SRS admite de 3 a 7 dias.
    assert 3 <= DEFAULT_HORIZON <= 7
    assert len(linear_regression(diaria(*["1.0"] * 10)).points) == DEFAULT_HORIZON
