"""Clasificacion termica por umbral (RF-01, RF-04)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest

from ola.domain.classification import average_recent, classify
from ola.domain.types import Reading, ThermalState

D = Decimal


class TestClassify:
    @pytest.mark.parametrize("valor", ["0.51", "1.0", "3.61", "10.895"])
    def test_por_encima_del_umbral_es_calido(self, valor):
        assert classify(D(valor)) is ThermalState.WARM

    @pytest.mark.parametrize("valor", ["-0.51", "-1.0", "-7.842"])
    def test_por_debajo_del_umbral_negativo_es_frio(self, valor):
        assert classify(D(valor)) is ThermalState.COLD

    @pytest.mark.parametrize("valor", ["0", "0.49", "-0.49", "0.5", "-0.5"])
    def test_dentro_del_rango_es_neutro(self, valor):
        assert classify(D(valor)) is ThermalState.NEUTRAL

    def test_el_umbral_exacto_es_neutro_por_ambos_lados(self):
        # Criterio de ENFEN: el limite pertenece al rango neutro.
        assert classify(D("0.5")) is ThermalState.NEUTRAL
        assert classify(D("-0.5")) is ThermalState.NEUTRAL

    def test_el_umbral_es_configurable(self):
        assert classify(D("0.8"), D("1.0")) is ThermalState.NEUTRAL
        assert classify(D("1.1"), D("1.0")) is ThermalState.WARM

    def test_solo_calido_y_frio_forman_racha(self):
        assert ThermalState.WARM.is_anomalous
        assert ThermalState.COLD.is_anomalous
        assert not ThermalState.NEUTRAL.is_anomalous
        assert not ThermalState.NO_DATA.is_anomalous


class TestAverageRecent:
    """El color del mapa sale de este promedio y no de la ultima medicion,
    para que un dia atipico no haga parpadear la zona.
    """

    REF = date(2026, 7, 31)

    def _serie(self, *valores: str) -> list[Reading]:
        # El ultimo valor corresponde a la fecha de referencia.
        return [
            Reading(self.REF - timedelta(days=len(valores) - 1 - i), D(v))
            for i, v in enumerate(valores)
        ]

    def test_promedia_la_ventana_indicada(self):
        serie = self._serie("1.0", "2.0", "3.0", "4.0", "5.0")
        assert average_recent(serie, reference_date=self.REF, window_days=5) == D(3)

    def test_ignora_las_mediciones_fuera_de_la_ventana(self):
        serie = self._serie("100.0", "1.0", "2.0", "3.0")
        # Ventana de 3 dias: quedan 1.0, 2.0 y 3.0.
        assert average_recent(serie, reference_date=self.REF, window_days=3) == D(2)

    def test_un_pico_moderado_no_cambia_el_color_de_la_zona(self):
        # Cuatro dias neutros y uno de 1.5: el promedio queda en 0.3, neutro.
        # Sin promediar, ese unico dia pintaria la zona de calido.
        serie = self._serie("0.1", "0.0", "1.5", "0.1", "-0.2")
        promedio = average_recent(serie, reference_date=self.REF, window_days=5)
        assert promedio is not None
        assert classify(promedio) is ThermalState.NEUTRAL

    def test_un_pico_muy_grande_si_mueve_la_clasificacion(self):
        # Un dia de 3.0 C sobre cuatro neutros deja el promedio en 0.64, calido.
        # Es lo deseable: una anomalia de esa magnitud no debe pasar inadvertida.
        serie = self._serie("0.1", "0.0", "3.0", "0.1", "0.0")
        promedio = average_recent(serie, reference_date=self.REF, window_days=5)
        assert promedio is not None
        assert classify(promedio) is ThermalState.WARM

    def test_sin_mediciones_en_la_ventana_devuelve_none(self):
        serie = [Reading(date(2016, 12, 31), D("1.0"))]
        assert average_recent(serie, reference_date=self.REF, window_days=5) is None

    def test_una_serie_vacia_devuelve_none(self):
        assert average_recent([], reference_date=self.REF, window_days=5) is None
