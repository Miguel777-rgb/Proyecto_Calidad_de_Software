"""Reevaluacion de las alertas y registro de sus avisos en un solo paso.

Antes eran acciones manuales del administrador despues de importar o de
cambiar los parametros. Si olvidaba reevaluar, el mapa mostraba zonas sin
alerta aunque su racha ya superara el minimo. Importar, guardar parametros, el
boton «Reevaluar alertas» y las tareas programadas usan esta misma funcion.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from ola.db.models import ImportRun, ImportStatus
from ola.services import alert_service, notification_service
from ola.services.alert_service import EvaluationSummary
from ola.services.settings_service import EffectiveSettings


@dataclass(frozen=True)
class RefreshSummary:
    evaluation: EvaluationSummary
    notifications_created: int


def refresh_alerts(session: Session, config: EffectiveSettings) -> RefreshSummary:
    """Recalcula los episodios de todas las zonas y registra los avisos nuevos.

    Los avisos se REGISTRAN pero no se envian: un servidor de correo lento o
    caido no debe bloquear ni hacer fallar la evaluacion. El envio es otro paso.
    """
    resumen = alert_service.evaluate(session, config)
    avisos = notification_service.create_for_events(
        session,
        opened_ids=resumen.opened_event_ids,
        closed_ids=resumen.closed_event_ids,
    )
    return RefreshSummary(evaluation=resumen, notifications_created=avisos)


def import_changed_readings(run: ImportRun) -> bool:
    """Una importacion obliga a reevaluar solo si termino y cambio mediciones.

    Reimportar el mismo archivo deja todo igual: reevaluar costaria unos
    segundos sin cambiar nada.
    """
    return run.status == ImportStatus.COMPLETED and (run.rows_inserted + run.rows_updated) > 0
