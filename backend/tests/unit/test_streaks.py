"""Deteccion de tendencia termica sostenida (RF-01).

Todas las series se construyen a mano para que los limites queden explicitos:
la racha justa, la que se queda a un registro, el hueco que se tolera y el
que rompe.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest

from ola.domain.streaks import detect_streaks
from ola.domain.types import Reading, StreakConfig, ThermalState

D = Decimal
INICIO = date(2026, 7, 1)


def diaria(*valores: str, desde: date = INICIO) -> list[Reading]:
    """Serie de mediciones en dias consecutivos."""
    return [Reading(desde + timedelta(days=i), D(v)) for i, v in enumerate(valores)]


def en_fechas(*pares: tuple[int, str], desde: date = INICIO) -> list[Reading]:
    """Serie con desplazamientos explicitos en dias respecto a `desde`."""
    return [Reading(desde + timedelta(days=off), D(v)) for off, v in pares]


class TestLongitudMinima:
    def test_exactamente_el_minimo_produce_racha(self):
        rachas = detect_streaks(diaria("1.0", "1.1", "1.2", "1.3", "1.4"))
        assert len(rachas) == 1
        assert rachas[0].length == 5

    def test_un_registro_menos_del_minimo_no_produce_racha(self):
        assert detect_streaks(diaria("1.0", "1.1", "1.2", "1.3")) == []

    def test_una_racha_mas_larga_se_detecta_completa(self):
        rachas = detect_streaks(diaria(*["1.0"] * 12))
        assert rachas[0].length == 12

    def test_el_minimo_es_configurable(self):
        serie = diaria("1.0", "1.1", "1.2")
        assert detect_streaks(serie) == []
        assert len(detect_streaks(serie, StreakConfig(min_records=3))) == 1


class TestHuecos:
    """Con la tolerancia por defecto de 2, medir el 30-jul y el 2-ago mantiene
    la racha; tres o mas dias faltantes la rompen.
    """

    def test_un_dia_faltante_no_rompe_la_racha(self):
        serie = en_fechas((0, "1.0"), (1, "1.1"), (3, "1.2"), (4, "1.3"), (5, "1.4"))
        assert len(detect_streaks(serie)) == 1

    def test_dos_dias_faltantes_no_rompen_la_racha(self):
        serie = en_fechas((0, "1.0"), (1, "1.1"), (4, "1.2"), (5, "1.3"), (6, "1.4"))
        rachas = detect_streaks(serie)
        assert len(rachas) == 1
        assert rachas[0].length == 5

    def test_tres_dias_faltantes_rompen_la_racha(self):
        serie = en_fechas((0, "1.0"), (1, "1.1"), (5, "1.2"), (6, "1.3"), (7, "1.4"))
        # Quedan dos trozos de 2 y 3 registros: ninguno llega al minimo.
        assert detect_streaks(serie) == []

    def test_tras_un_hueco_grande_la_racha_vuelve_a_empezar(self):
        serie = en_fechas(
            (0, "1.0"),
            (1, "1.1"),
            (2, "1.2"),
            (10, "1.3"),
            (11, "1.4"),
            (12, "1.5"),
            (13, "1.6"),
            (14, "1.7"),
        )
        rachas = detect_streaks(serie)
        assert len(rachas) == 1
        assert rachas[0].length == 5
        assert rachas[0].started_on == INICIO + timedelta(days=10)

    def test_la_tolerancia_es_configurable(self):
        serie = en_fechas((0, "1.0"), (1, "1.1"), (5, "1.2"), (6, "1.3"), (7, "1.4"))
        assert detect_streaks(serie) == []
        assert len(detect_streaks(serie, StreakConfig(max_gap_days=3))) == 1

    def test_sin_tolerancia_cualquier_falta_rompe(self):
        serie = en_fechas((0, "1.0"), (1, "1.1"), (3, "1.2"), (4, "1.3"), (5, "1.4"))
        assert detect_streaks(serie, StreakConfig(max_gap_days=0)) == []


class TestInterrupciones:
    def test_un_valor_neutro_en_medio_rompe_la_racha(self):
        serie = diaria("1.0", "1.1", "0.2", "1.2", "1.3", "1.4")
        assert detect_streaks(serie) == []

    def test_el_umbral_exacto_cuenta_como_neutro_y_rompe(self):
        serie = diaria("1.0", "1.1", "0.5", "1.2", "1.3", "1.4")
        assert detect_streaks(serie) == []

    def test_pasar_de_calido_a_frio_separa_dos_episodios(self):
        serie = diaria("1.0", "1.1", "1.2", "1.3", "1.4", "-1.0", "-1.1", "-1.2", "-1.3", "-1.4")
        rachas = detect_streaks(serie)
        assert [r.state for r in rachas] == [ThermalState.WARM, ThermalState.COLD]
        assert all(r.length == 5 for r in rachas)

    def test_detecta_varios_episodios_separados_por_periodos_neutros(self):
        serie = diaria(
            "1.0",
            "1.1",
            "1.2",
            "1.3",
            "1.4",
            "0.0",
            "0.1",
            "-1.0",
            "-1.1",
            "-1.2",
            "-1.3",
            "-1.4",
        )
        rachas = detect_streaks(serie)
        assert len(rachas) == 2
        assert rachas[0].state is ThermalState.WARM
        assert rachas[1].state is ThermalState.COLD


class TestDatosDelEpisodio:
    def test_registra_la_fecha_de_inicio_y_de_fin(self):
        racha = detect_streaks(diaria("1.0", "1.1", "1.2", "1.3", "1.4"))[0]
        assert racha.started_on == INICIO
        assert racha.ended_on == INICIO + timedelta(days=4)

    def test_el_pico_calido_es_el_valor_maximo(self):
        racha = detect_streaks(diaria("1.0", "2.5", "1.2", "1.3", "1.4"))[0]
        assert racha.peak_anomaly_c == D("2.5")

    def test_el_pico_frio_es_el_valor_minimo(self):
        racha = detect_streaks(diaria("-1.0", "-2.5", "-1.2", "-1.3", "-1.4"))[0]
        assert racha.peak_anomaly_c == D("-2.5")

    def test_la_longitud_cuenta_registros_y_no_dias_de_calendario(self):
        # Cinco mediciones repartidas en siete dias de calendario.
        serie = en_fechas((0, "1.0"), (1, "1.1"), (3, "1.2"), (5, "1.3"), (6, "1.4"))
        racha = detect_streaks(serie)[0]
        assert racha.length == 5
        assert (racha.ended_on - racha.started_on).days == 6


class TestCasosLimite:
    def test_una_serie_vacia_no_produce_rachas(self):
        assert detect_streaks([]) == []

    def test_una_serie_toda_neutra_no_produce_rachas(self):
        assert detect_streaks(diaria("0.1", "-0.2", "0.3", "0.0", "0.4", "-0.1")) == []

    def test_una_sola_medicion_no_produce_racha(self):
        assert detect_streaks(diaria("3.0")) == []

    def test_no_depende_del_orden_en_que_lleguen_las_mediciones(self):
        ordenada = diaria("1.0", "1.1", "1.2", "1.3", "1.4")
        desordenada = [ordenada[3], ordenada[0], ordenada[4], ordenada[1], ordenada[2]]
        assert detect_streaks(desordenada) == detect_streaks(ordenada)

    def test_una_racha_que_llega_al_final_de_la_serie_se_detecta(self):
        # Sin cerrar el ultimo episodio, la alerta vigente se perderia.
        serie = diaria("0.1", "0.2", "1.0", "1.1", "1.2", "1.3", "1.4")
        rachas = detect_streaks(serie)
        assert len(rachas) == 1
        assert rachas[0].ended_on == INICIO + timedelta(days=6)


class TestConfiguracion:
    @pytest.mark.parametrize(
        ("campo", "valor"),
        [("threshold_c", D(0)), ("threshold_c", D(-1)), ("min_records", 1), ("max_gap_days", -1)],
    )
    def test_rechaza_parametros_invalidos(self, campo, valor):
        with pytest.raises(ValueError):
            StreakConfig(**{campo: valor})

    def test_el_umbral_configurado_cambia_que_cuenta_como_racha(self):
        serie = diaria("0.7", "0.8", "0.9", "0.7", "0.8")
        assert len(detect_streaks(serie)) == 1
        assert detect_streaks(serie, StreakConfig(threshold_c=D("1.0"))) == []
