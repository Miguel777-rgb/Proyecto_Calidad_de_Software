"""Lectura y validacion del CSV de ATSM publicado por IMARPE (RF-08).

Logica pura: recibe lineas de texto y devuelve filas validas o errores.
No conoce la base de datos ni FastAPI, por lo que se prueba sin infraestructura.
"""

from __future__ import annotations

import csv
import re
from collections.abc import Collection, Iterable, Iterator
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

COLUMNS = ("FECHA_MEDICION", "LABORATORIO_COSTERO", "ANOMALIA_TEMPERATURA")

# El archivo de IMARPE viene en UTF-8 con BOM. Si se decodifica como utf-8 a
# secas, el nombre de la primera columna queda con el marcador delante.
BOM = "﻿"

# El diccionario oficial documenta 'NaN' como marca de dato ausente.
MISSING_TOKENS = frozenset({"", "NAN", "NA", "NULL", "NONE", "-"})

_ESPACIOS = re.compile(r"\s+")


class InvalidHeaderError(ValueError):
    """La cabecera no corresponde al dataset de ATSM.

    Es un error del archivo completo, no de una fila: si las columnas no son
    las esperadas no tiene sentido seguir leyendo.
    """


@dataclass(frozen=True)
class ParsedRow:
    line: int
    measured_on: date
    laboratory_code: str
    anomaly_c: Decimal


@dataclass(frozen=True)
class RowError:
    line: int
    reason: str
    content: str


def normalize_code(value: str) -> str:
    """Normaliza el nombre del laboratorio: 'san  jose ' -> 'SAN JOSE'."""
    return _ESPACIOS.sub(" ", value.strip()).upper()


def _validate_header(header: list[str]) -> None:
    limpias = [normalize_code(c.lstrip(BOM)) for c in header]
    faltantes = [c for c in COLUMNS if c not in limpias]
    if faltantes:
        raise InvalidHeaderError(
            "El archivo no tiene las columnas del dataset ATSM. "
            f"Faltan: {', '.join(faltantes)}. Se esperaba: {', '.join(COLUMNS)}."
        )


def parse_atsm(
    lines: Iterable[str], *, known_codes: Collection[str]
) -> Iterator[ParsedRow | RowError]:
    """Recorre el CSV y va entregando filas validas o el motivo del rechazo.

    Es un generador para no cargar en memoria las 125 mil filas del archivo.
    Lanza InvalidHeaderError si la cabecera no corresponde al dataset.
    """
    codigos = {normalize_code(c) for c in known_codes}
    lector = csv.reader(lines)

    try:
        cabecera = next(lector)
    except StopIteration:
        raise InvalidHeaderError("El archivo esta vacio.") from None

    _validate_header(cabecera)
    indices = {normalize_code(c.lstrip(BOM)): i for i, c in enumerate(cabecera)}
    i_fecha = indices[COLUMNS[0]]
    i_lab = indices[COLUMNS[1]]
    i_valor = indices[COLUMNS[2]]
    minimo = max(i_fecha, i_lab, i_valor) + 1
    esperadas = len(cabecera)

    # La cabecera es la linea 1: los datos empiezan en la 2.
    for numero, fila in enumerate(lector, start=2):
        if not fila or all(not celda.strip() for celda in fila):
            continue
        crudo = ",".join(fila)

        if len(fila) < minimo:
            yield RowError(numero, "La fila no tiene las tres columnas esperadas.", crudo)
            continue

        # Una columna de mas suele significar un decimal escrito con coma:
        # '1,5' se parte en '1' y '5', y sin este control la fila entraria
        # con el valor 1 en lugar de 1.5. Se ignoran las comas finales.
        utiles = len(fila)
        while utiles > esperadas and not fila[utiles - 1].strip():
            utiles -= 1
        if utiles > esperadas:
            yield RowError(
                numero,
                f"La fila tiene {utiles} columnas y se esperaban {esperadas}. "
                "Revisa si algun decimal usa coma en lugar de punto.",
                crudo,
            )
            continue

        texto_fecha = fila[i_fecha].strip()
        try:
            medida = date.fromisoformat(texto_fecha)
        except ValueError:
            yield RowError(
                numero, f"Fecha invalida: '{texto_fecha}'. Se espera el formato AAAA-MM-DD.", crudo
            )
            continue

        codigo = normalize_code(fila[i_lab])
        if not codigo:
            yield RowError(numero, "El laboratorio costero esta vacio.", crudo)
            continue
        if codigo not in codigos:
            # No se crean laboratorios solos: una errata generaria una zona
            # fantasma y el mapa dejaria de tener las 10 del RF-04.
            yield RowError(numero, f"Laboratorio costero desconocido: '{codigo}'.", crudo)
            continue

        texto_valor = fila[i_valor].strip()
        if texto_valor.upper() in MISSING_TOKENS:
            yield RowError(numero, "La anomalia no tiene valor.", crudo)
            continue
        try:
            valor = Decimal(texto_valor)
        except InvalidOperation:
            yield RowError(numero, f"Anomalia no numerica: '{texto_valor}'.", crudo)
            continue
        if not valor.is_finite():
            yield RowError(numero, f"Anomalia no numerica: '{texto_valor}'.", crudo)
            continue

        yield ParsedRow(numero, medida, codigo, valor)
