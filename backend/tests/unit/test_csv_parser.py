"""Lectura y validacion del CSV de ATSM (RF-08)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from ola.domain.csv_parser import (
    BOM,
    InvalidHeaderError,
    ParsedRow,
    RowError,
    normalize_code,
    parse_atsm,
)

LABS = ["CALLAO", "PISCO", "SAN JOSE", "ILO"]
CABECERA = "FECHA_MEDICION,LABORATORIO_COSTERO,ANOMALIA_TEMPERATURA"


def analizar(*lineas: str, labs: list[str] | None = None):
    return list(parse_atsm(list(lineas), known_codes=labs if labs is not None else LABS))


def filas(resultado):
    return [r for r in resultado if isinstance(r, ParsedRow)]


def errores(resultado):
    return [r for r in resultado if isinstance(r, RowError)]


class TestCabecera:
    def test_acepta_la_cabecera_del_dataset(self):
        assert analizar(CABECERA) == []

    def test_acepta_la_cabecera_con_marca_de_orden_de_bytes(self):
        # El archivo de IMARPE viene en UTF-8 con BOM. Sin esto, la primera
        # columna se lee como '﻿FECHA_MEDICION' y el archivo se rechaza.
        resultado = analizar(BOM + CABECERA, "2026-07-31,CALLAO,1.5")
        assert len(filas(resultado)) == 1

    def test_tolera_columnas_en_otro_orden(self):
        resultado = analizar(
            "ANOMALIA_TEMPERATURA,FECHA_MEDICION,LABORATORIO_COSTERO",
            "1.5,2026-07-31,CALLAO",
        )
        assert filas(resultado)[0].anomaly_c == Decimal("1.5")

    def test_rechaza_un_archivo_sin_las_columnas_esperadas(self):
        with pytest.raises(InvalidHeaderError, match="FECHA_MEDICION"):
            analizar("fecha,lugar,valor")

    def test_rechaza_un_archivo_vacio(self):
        with pytest.raises(InvalidHeaderError, match="vacio"):
            analizar()

    def test_el_mensaje_indica_que_columna_falta(self):
        with pytest.raises(InvalidHeaderError, match="ANOMALIA_TEMPERATURA"):
            analizar("FECHA_MEDICION,LABORATORIO_COSTERO")


class TestFilasValidas:
    def test_lee_fecha_laboratorio_y_valor(self):
        fila = filas(analizar(CABECERA, "2026-07-31,CALLAO,-1.9048"))[0]
        assert fila.measured_on == date(2026, 7, 31)
        assert fila.laboratory_code == "CALLAO"
        assert fila.anomaly_c == Decimal("-1.9048")

    def test_conserva_la_precision_decimal(self):
        # Con float, -1.9048 se almacenaria como -1.9047999999999999.
        fila = filas(analizar(CABECERA, "2026-07-31,CALLAO,-1.9048"))[0]
        assert str(fila.anomaly_c) == "-1.9048"

    def test_numera_las_lineas_contando_la_cabecera(self):
        resultado = filas(analizar(CABECERA, "2026-07-31,CALLAO,1.0", "2026-07-30,ILO,2.0"))
        assert [f.line for f in resultado] == [2, 3]

    @pytest.mark.parametrize("valor", ["0", "0.0", "-0.5", "10.895", "-7.842", "3"])
    def test_acepta_valores_numericos_de_distinta_forma(self, valor):
        assert len(filas(analizar(CABECERA, f"2026-07-31,CALLAO,{valor}"))) == 1

    def test_normaliza_el_nombre_del_laboratorio(self):
        fila = filas(analizar(CABECERA, "2026-07-31,  san  jose ,1.0"))[0]
        assert fila.laboratory_code == "SAN JOSE"

    def test_omite_las_lineas_en_blanco(self):
        resultado = analizar(CABECERA, "", "2026-07-31,CALLAO,1.0", "   ")
        assert len(filas(resultado)) == 1
        assert errores(resultado) == []


class TestFilasRechazadas:
    @pytest.mark.parametrize(
        "fecha", ["31-07-2026", "2026/07/31", "2026-13-01", "2026-02-30", "ayer", ""]
    )
    def test_rechaza_fechas_invalidas(self, fecha):
        resultado = analizar(CABECERA, f"{fecha},CALLAO,1.0")
        assert len(errores(resultado)) == 1
        assert "Fecha invalida" in errores(resultado)[0].reason

    @pytest.mark.parametrize("valor", ["NaN", "nan", "", "   ", "NULL", "-"])
    def test_rechaza_las_marcas_de_dato_ausente(self, valor):
        # El diccionario oficial documenta 'NaN' como ausencia de dato.
        resultado = analizar(CABECERA, f"2026-07-31,CALLAO,{valor}")
        assert "no tiene valor" in errores(resultado)[0].reason

    @pytest.mark.parametrize("valor", ["muy calido", "1.5.2", "--3"])
    def test_rechaza_valores_no_numericos(self, valor):
        resultado = analizar(CABECERA, f"2026-07-31,CALLAO,{valor}")
        assert "no numerica" in errores(resultado)[0].reason

    def test_rechaza_un_decimal_escrito_con_coma(self):
        # '1,5' se parte en dos columnas: sin este control la fila entraria
        # con el valor 1 en lugar de 1.5, corrompiendo el dato en silencio.
        resultado = analizar(CABECERA, "2026-07-31,CALLAO,1,5")
        assert len(filas(resultado)) == 0
        assert "coma en lugar de punto" in errores(resultado)[0].reason

    def test_tolera_una_coma_final_sin_contenido(self):
        resultado = analizar(CABECERA, "2026-07-31,CALLAO,1.5,")
        assert filas(resultado)[0].anomaly_c == Decimal("1.5")

    def test_rechaza_infinito(self):
        resultado = analizar(CABECERA, "2026-07-31,CALLAO,Infinity")
        assert "no numerica" in errores(resultado)[0].reason

    def test_rechaza_un_laboratorio_desconocido(self):
        # El diccionario oficial nombra HUANCHACO, que no existe en los datos.
        # Aceptarlo crearia una zona 11 y rompería el RF-04.
        resultado = analizar(CABECERA, "2026-07-31,HUANCHACO,1.0")
        assert "desconocido" in errores(resultado)[0].reason

    def test_rechaza_un_laboratorio_vacio(self):
        resultado = analizar(CABECERA, "2026-07-31,,1.0")
        assert "vacio" in errores(resultado)[0].reason

    def test_rechaza_una_fila_incompleta(self):
        resultado = analizar(CABECERA, "2026-07-31,CALLAO")
        assert "tres columnas" in errores(resultado)[0].reason

    def test_el_error_conserva_la_linea_y_el_contenido(self):
        error = errores(analizar(CABECERA, "2026-07-31,CALLAO,1.0", "mala,CALLAO,1.0"))[0]
        assert error.line == 3
        assert "mala" in error.content


class TestImportacionParcial:
    """Un dataset publico rara vez es perfecto: descartar 125 mil filas buenas
    por unas pocas malas dejaria el sistema sin datos.
    """

    def test_las_filas_validas_sobreviven_a_las_invalidas(self):
        resultado = analizar(
            CABECERA,
            "2026-07-29,CALLAO,1.0",
            "fecha-mala,CALLAO,2.0",
            "2026-07-30,HUANCHACO,3.0",
            "2026-07-31,PISCO,4.0",
        )
        assert [f.laboratory_code for f in filas(resultado)] == ["CALLAO", "PISCO"]
        assert len(errores(resultado)) == 2

    def test_informa_de_cada_error_por_separado(self):
        resultado = analizar(CABECERA, "mala,CALLAO,1.0", "2026-07-31,X,1.0")
        assert [e.line for e in errores(resultado)] == [2, 3]


class TestNormalizeCode:
    @pytest.mark.parametrize(
        ("entrada", "esperado"),
        [
            ("callao", "CALLAO"),
            ("  ILO  ", "ILO"),
            ("san  jose", "SAN JOSE"),
            ("San\tJose", "SAN JOSE"),
            ("", ""),
        ],
    )
    def test_normaliza(self, entrada, esperado):
        assert normalize_code(entrada) == esperado
