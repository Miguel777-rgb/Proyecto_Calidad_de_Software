from datetime import datetime, timedelta
from enum import Enum

from disponibilidad import ABAJO, ARRIBA, Latido, formatear, resumir

PENDIENTE = 2
MANTENIMIENTO = 3
INICIO = datetime(2026, 9, 14, 12, 0)


def serie(*estados: int) -> list[Latido]:
    """Un chequeo por minuto con los estados dados."""
    return [Latido(INICIO + timedelta(minutes=i), estado) for i, estado in enumerate(estados)]


def test_todo_arriba_es_cien_por_ciento_sin_caidas() -> None:
    resumen = resumir(serie(ARRIBA, ARRIBA, ARRIBA))

    assert resumen.porcentaje == 100
    assert resumen.caidas == []


def test_sin_chequeos_no_inventa_un_porcentaje() -> None:
    resumen = resumir([])

    assert resumen.porcentaje is None
    assert "Sin chequeos" in formatear(resumen, horas=24)


def test_pendientes_y_mantenimiento_no_cuentan() -> None:
    resumen = resumir(serie(ARRIBA, PENDIENTE, MANTENIMIENTO, ABAJO))

    assert resumen.chequeos == 2
    assert resumen.porcentaje == 50


def test_agrupa_chequeos_fallidos_seguidos_en_una_sola_caida() -> None:
    resumen = resumir(serie(ARRIBA, ABAJO, ABAJO, ABAJO, ARRIBA, ABAJO, ARRIBA))

    assert len(resumen.caidas) == 2
    primera = resumen.caidas[0]
    assert primera.chequeos == 3
    assert primera.inicio == INICIO + timedelta(minutes=1)
    assert primera.fin == INICIO + timedelta(minutes=4)


def test_una_caida_sin_recuperar_queda_abierta() -> None:
    resumen = resumir(serie(ARRIBA, ABAJO, ABAJO))

    assert resumen.caidas[-1].fin is None
    assert "sin recuperar" in formatear(resumen, horas=1)


def test_ordena_los_chequeos_aunque_lleguen_desordenados() -> None:
    latidos = serie(ARRIBA, ABAJO, ARRIBA)
    resumen = resumir(reversed(latidos))

    assert resumen.desde == INICIO
    assert resumen.caidas[0].fin == INICIO + timedelta(minutes=2)


def test_lee_el_latido_con_texto_o_con_enumeracion() -> None:
    class Estado(Enum):
        UP = 1

    como_texto = Latido.desde_uptime_kuma(
        {"status": 0, "time": "2026-09-14 12:00:05.123", "msg": "Connection refused"}
    )
    como_enum = Latido.desde_uptime_kuma({"status": Estado.UP, "time": INICIO, "msg": None})

    assert como_texto == Latido(datetime(2026, 9, 14, 12, 0, 5, 123000), ABAJO, "Connection refused")
    assert como_enum == Latido(INICIO, ARRIBA, "")


def test_el_informe_muestra_el_porcentaje_con_dos_decimales() -> None:
    resumen = resumir(serie(*([ARRIBA] * 199 + [ABAJO])))

    assert "Disponibilidad: 99.50 %" in formatear(resumen, horas=24)
