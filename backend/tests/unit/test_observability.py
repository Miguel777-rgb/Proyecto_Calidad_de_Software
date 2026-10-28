"""Formato de los logs y rastreo de errores (ola.observability)."""

from __future__ import annotations

import json
import logging

import sentry_sdk

from ola.observability import JsonFormatter, configure_logging, init_error_tracking


def registro(mensaje: str = "importacion %s", *args: object, exc_info=None) -> logging.LogRecord:
    return logging.LogRecord(
        "ola.jobs", logging.ERROR, __file__, 10, mensaje, args or ("lista",), exc_info
    )


class TestFormatoJson:
    def test_cada_linea_es_un_objeto_json(self):
        linea = JsonFormatter().format(registro())
        datos = json.loads(linea)

        assert datos["level"] == "ERROR"
        assert datos["logger"] == "ola.jobs"
        assert datos["message"] == "importacion lista"
        assert datos["time"].endswith("+00:00")

    def test_incluye_la_traza_del_error(self):
        try:
            raise RuntimeError("SMTP caido")
        except RuntimeError:
            import sys

            linea = JsonFormatter().format(
                registro("fallo el envio %s", "smtp", exc_info=sys.exc_info())
            )

        assert "RuntimeError: SMTP caido" in json.loads(linea)["exception"]

    def test_respeta_los_acentos(self):
        linea = JsonFormatter().format(registro("Importación %s", "fallida"))
        assert "Importación fallida" in linea


class TestConfiguracion:
    def test_en_json_la_raiz_escribe_objetos_json(self, settings_factory):
        raiz = logging.Logger("prueba-json")
        configure_logging(settings_factory(log_format="json"), root=raiz)

        assert isinstance(raiz.handlers[0].formatter, JsonFormatter)

    def test_en_texto_usa_el_formato_legible(self, settings_factory):
        raiz = logging.Logger("prueba-texto")
        configure_logging(settings_factory(), root=raiz)

        assert not isinstance(raiz.handlers[0].formatter, JsonFormatter)

    def test_no_toca_una_raiz_ya_configurada(self, settings_factory):
        raiz = logging.Logger("ya-configurada")
        existente = logging.NullHandler()
        raiz.addHandler(existente)

        configure_logging(settings_factory(log_format="json", log_level="WARNING"), root=raiz)

        assert raiz.handlers == [existente]
        assert raiz.level == logging.WARNING


class TestRastreoDeErrores:
    def test_sin_dsn_queda_desactivado(self, settings_factory, monkeypatch):
        llamadas: list[dict] = []
        monkeypatch.setattr(sentry_sdk, "init", lambda **kw: llamadas.append(kw))

        assert init_error_tracking(settings_factory()) is False
        assert llamadas == []

    def test_con_dsn_lo_activa_sin_datos_personales(self, settings_factory, monkeypatch):
        llamadas: list[dict] = []
        monkeypatch.setattr(sentry_sdk, "init", lambda **kw: llamadas.append(kw))
        dsn = "https://clave@glitchtip.ejemplo.pe/1"

        assert init_error_tracking(settings_factory(sentry_dsn=dsn, env="development")) is True
        assert llamadas == [
            {
                "dsn": dsn,
                "environment": "development",
                "send_default_pii": False,
                "traces_sample_rate": 0.0,
            }
        ]
