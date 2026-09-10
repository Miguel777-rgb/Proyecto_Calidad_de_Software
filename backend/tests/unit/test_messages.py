"""Textos de los avisos de alerta (RF-03).

El destinatario que describe la SRS es un pescador artesanal que puede tener
alfabetizacion digital limitada, asi que el contenido se revisa aqui.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from ola.domain.messages import ATRIBUCION, alert_closed, alert_opened

D = Decimal


def abierta(**cambios):
    datos = {
        "zona": "Callao",
        "state": "warm",
        "started_on": date(2026, 4, 16),
        "streak_length": 107,
        "peak_anomaly_c": D("6.3100"),
    }
    return alert_opened(**{**datos, **cambios})


def cerrada(**cambios):
    datos = {
        "zona": "Callao",
        "state": "cold",
        "started_on": date(2026, 4, 16),
        "ended_on": date(2026, 5, 20),
    }
    return alert_closed(**{**datos, **cambios})


class TestAvisoDeApertura:
    def test_el_asunto_nombra_la_zona_y_el_tipo_de_alerta(self):
        assert abierta().subject == "OLA: alerta cálida en Callao"

    def test_el_asunto_distingue_frio_de_calido(self):
        assert "fría" in abierta(state="cold").subject

    def test_explica_desde_cuando_y_cuantas_mediciones(self):
        cuerpo = abierta().body
        assert "2026-04-16" in cuerpo
        assert "107 mediciones seguidas" in cuerpo

    def test_redondea_el_valor_extremo(self):
        # El dato guarda cuatro decimales; en el correo sobran.
        assert "6.31 °C" in abierta().body
        assert "6.3100" not in abierta().body

    def test_el_texto_explicativo_evita_la_jerga_tecnica(self):
        # Solo se revisa la explicacion: el pie lleva la atribucion oficial,
        # que incluye el nombre tecnico del dataset y es obligatoria.
        explicacion = abierta().body.split("Recibes este aviso")[0]
        assert "anomalía" not in explicacion.lower()
        assert "calentamiento" in explicacion
        assert "enfriamiento" in abierta(state="cold").body.split("Recibes este aviso")[0]

    def test_anuncia_que_habra_aviso_de_cierre(self):
        assert "vuelva a la normalidad" in abierta().body

    def test_incluye_la_atribucion_obligatoria_a_imarpe(self):
        assert ATRIBUCION in abierta().body

    def test_aclara_que_no_reemplaza_a_imarpe_ni_predice_el_nino(self):
        cuerpo = abierta().body
        assert "no los reemplaza" in cuerpo
        assert "ENFEN" in cuerpo

    def test_explica_por_que_se_recibe_y_como_darse_de_baja(self):
        cuerpo = abierta().body
        assert "te suscribiste" in cuerpo
        assert "darte de baja" in cuerpo


class TestAvisoDeCierre:
    def test_el_asunto_indica_que_la_alerta_termino(self):
        assert cerrada().subject == "OLA: terminó la alerta fría en Callao"

    def test_indica_el_periodo_que_duro_el_episodio(self):
        cuerpo = cerrada().body
        assert "2026-04-16" in cuerpo
        assert "2026-05-20" in cuerpo
        assert "35 días" in cuerpo

    def test_un_episodio_de_un_solo_dia_cuenta_un_dia(self):
        cuerpo = cerrada(started_on=date(2026, 4, 16), ended_on=date(2026, 4, 16)).body
        assert "1 días" in cuerpo

    def test_tambien_lleva_la_atribucion(self):
        assert ATRIBUCION in cerrada().body


@pytest.mark.parametrize("mensaje", [abierta(), cerrada()])
def test_ningun_aviso_menciona_sms(mensaje):
    # RF-03 se redujo a correo y avisos dentro de la aplicacion.
    assert "SMS" not in mensaje.body
    assert "mensaje de texto" not in mensaje.body.lower()
