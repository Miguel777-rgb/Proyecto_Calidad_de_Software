"""Parametros efectivos del sistema.

Los valores de `.env` son el punto de partida; el administrador puede
ajustarlos en caliente desde la aplicacion y esos cambios mandan.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from sqlalchemy.orm import Session

from ola.config import Settings
from ola.domain.types import StreakConfig
from ola.repositories import settings_repo

# Cuantos dias promedia el mapa para decidir el color de una zona (RF-04).
DEFAULT_MAP_WINDOW_DAYS = 5

# Parametros enteros ajustables, con su rango admitido.
LIMITES: dict[str, tuple[int, int]] = {
    "min_streak_records": (2, 60),
    "max_gap_days": (0, 30),
    "freshness_days": (1, 365),
    "map_window_days": (1, 60),
}

UMBRAL_MINIMO = Decimal("0.1")
UMBRAL_MAXIMO = Decimal("5.0")


class InvalidSettingError(ValueError):
    pass


@dataclass(frozen=True)
class EffectiveSettings:
    threshold_c: Decimal
    min_streak_records: int
    max_gap_days: int
    freshness_days: int
    map_window_days: int

    @property
    def streak_config(self) -> StreakConfig:
        return StreakConfig(
            threshold_c=self.threshold_c,
            min_records=self.min_streak_records,
            max_gap_days=self.max_gap_days,
        )

    def as_dict(self) -> dict[str, object]:
        return {
            "threshold_c": str(self.threshold_c),
            "min_streak_records": self.min_streak_records,
            "max_gap_days": self.max_gap_days,
            "freshness_days": self.freshness_days,
            "map_window_days": self.map_window_days,
        }


def _a_entero(clave: str, valor: object) -> int:
    # bool es subclase de int en Python: aceptarlo guardaria True como 1.
    if isinstance(valor, bool):
        raise InvalidSettingError(f"'{clave}' debe ser un numero entero.")
    if isinstance(valor, int):
        return valor
    if isinstance(valor, str | float):
        try:
            return int(valor)
        except ValueError:
            raise InvalidSettingError(f"'{clave}' debe ser un numero entero.") from None
    raise InvalidSettingError(f"'{clave}' debe ser un numero entero.")


def _a_umbral(valor: object) -> Decimal:
    if isinstance(valor, bool) or not isinstance(valor, int | float | str | Decimal):
        raise InvalidSettingError("El umbral debe ser un numero.")
    try:
        return Decimal(str(valor))
    except InvalidOperation:
        raise InvalidSettingError("El umbral debe ser un numero.") from None


def get_effective(session: Session, settings: Settings) -> EffectiveSettings:
    guardados = settings_repo.get_all(session)

    def entero(clave: str, por_defecto: int) -> int:
        if clave not in guardados:
            return por_defecto
        return _a_entero(clave, guardados[clave])

    umbral = (
        _a_umbral(guardados["threshold_c"])
        if "threshold_c" in guardados
        else Decimal(str(settings.threshold_c))
    )

    return EffectiveSettings(
        threshold_c=umbral,
        min_streak_records=entero("min_streak_records", settings.min_streak_records),
        max_gap_days=entero("max_gap_days", settings.max_gap_days),
        freshness_days=entero("freshness_days", settings.freshness_days),
        map_window_days=entero("map_window_days", DEFAULT_MAP_WINDOW_DAYS),
    )


def update(
    session: Session, cambios: dict[str, object], *, updated_by_id: int | None = None
) -> None:
    """Valida y guarda los parametros ajustables.

    No reevalua las alertas: los episodios ya detectados conservan los
    parametros con los que se encontraron, y el administrador decide cuando
    recalcular. Asi un cambio accidental no borra el historico.
    """
    for clave, valor in cambios.items():
        if clave == "threshold_c":
            umbral = _a_umbral(valor)
            if not (UMBRAL_MINIMO <= umbral <= UMBRAL_MAXIMO):
                raise InvalidSettingError(
                    f"El umbral debe estar entre {UMBRAL_MINIMO} y {UMBRAL_MAXIMO} grados."
                )
            settings_repo.put(session, clave, str(umbral), updated_by_id=updated_by_id)
            continue

        if clave not in LIMITES:
            raise InvalidSettingError(f"Parametro desconocido: '{clave}'.")

        numero = _a_entero(clave, valor)
        minimo, maximo = LIMITES[clave]
        if not (minimo <= numero <= maximo):
            raise InvalidSettingError(f"'{clave}' debe estar entre {minimo} y {maximo}.")
        settings_repo.put(session, clave, numero, updated_by_id=updated_by_id)
