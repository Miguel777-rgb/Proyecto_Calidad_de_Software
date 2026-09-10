"""Pruebas de la configuracion (Fase 0, base de todos los requisitos)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from ola.config import Settings


def test_valores_por_defecto_coinciden_con_las_reglas_acordadas(settings_factory):
    s = settings_factory()
    assert s.threshold_c == 0.5
    assert s.min_streak_records == 5
    assert s.max_gap_days == 2
    assert s.freshness_days == 7


def test_cors_origins_acepta_una_cadena_separada_por_comas(settings_factory):
    s = settings_factory(cors_origins="http://a.pe, http://b.pe ,")
    assert s.cors_origins == ["http://a.pe", "http://b.pe"]


def test_cors_origins_acepta_una_lista_tal_cual(settings_factory):
    s = settings_factory(cors_origins=["http://a.pe"])
    assert s.cors_origins == ["http://a.pe"]


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("threshold_c", 0),
        ("threshold_c", -1),
        ("min_streak_records", 1),
        ("max_gap_days", -1),
        ("freshness_days", 0),
        ("projection_horizon_days", 8),
    ],
)
def test_rechaza_parametros_de_dominio_fuera_de_rango(settings_factory, campo, valor):
    with pytest.raises(ValidationError):
        settings_factory(**{campo: valor})


def test_is_production_solo_es_verdadero_en_produccion(settings_factory):
    assert settings_factory(env="production").is_production is True
    assert settings_factory(env="development").is_production is False


def test_lee_variables_de_entorno_con_prefijo_ola(monkeypatch):
    monkeypatch.setenv("OLA_FRESHNESS_DAYS", "15")
    monkeypatch.setenv("OLA_ENV", "test")
    s = Settings(_env_file=None)
    assert s.freshness_days == 15
    assert s.env == "test"


def test_cors_origins_se_lee_desde_variable_de_entorno_sin_formato_json(monkeypatch):
    """Regresion: pydantic-settings intentaba interpretar la lista como JSON
    y el backend no arrancaba. Se resolvio anotando el campo con NoDecode.
    """
    monkeypatch.setenv("OLA_CORS_ORIGINS", "http://localhost:5173,https://ola.pe")
    s = Settings(_env_file=None)
    assert s.cors_origins == ["http://localhost:5173", "https://ola.pe"]


class TestSecretosEnProduccion:
    """Un JWT firmado con un secreto debil o publico permite a cualquiera
    emitir tokens de administrador. Produccion debe negarse a arrancar.
    """

    SECRETO_VALIDO = "a" * 64
    CLAVE_ADMIN_VALIDA = "clave-propia-del-equipo"

    def _produccion(self, settings_factory, **overrides):
        base = {
            "env": "production",
            "jwt_secret": self.SECRETO_VALIDO,
            "admin_password": self.CLAVE_ADMIN_VALIDA,
        }
        return settings_factory(**{**base, **overrides})

    def test_acepta_una_configuracion_de_produccion_correcta(self, settings_factory):
        assert self._produccion(settings_factory).is_production is True

    def test_rechaza_un_secreto_mas_corto_de_32_bytes(self, settings_factory):
        with pytest.raises(ValidationError, match="al menos 32 bytes"):
            self._produccion(settings_factory, jwt_secret="corto")

    def test_rechaza_el_secreto_de_la_plantilla(self, settings_factory):
        with pytest.raises(ValidationError, match="valor de la plantilla"):
            self._produccion(
                settings_factory,
                jwt_secret="cambia_este_secreto_por_uno_aleatorio_de_64_caracteres",
            )

    def test_rechaza_la_clave_de_administrador_de_la_plantilla(self, settings_factory):
        with pytest.raises(ValidationError, match="OLA_ADMIN_PASSWORD"):
            self._produccion(settings_factory, admin_password="cambia_esta_clave_de_admin")

    def test_en_desarrollo_no_estorba_con_valores_por_defecto(self, settings_factory):
        # Levantar el entorno local no debe exigir generar secretos.
        assert settings_factory(env="development").is_production is False
