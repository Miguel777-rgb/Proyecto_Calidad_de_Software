"""Episodios de anomalia sostenida (RF-01)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from ola.api.deps import AdminUser, EffectiveSettingsDep, MailerDep, SessionDep
from ola.api.schemas.alerts import AlertEventOut, EvaluationSummaryOut, StreakOut
from ola.api.schemas.notifications import SendSummaryOut
from ola.domain.streaks import detect_streaks
from ola.repositories import alerts_repo, labs_repo, notifications_repo, readings_repo
from ola.services import alert_service, notification_service

router = APIRouter(tags=["alertas"])


@router.get("/api/alerts", response_model=list[AlertEventOut], summary="Lista los episodios")
def list_alerts(
    session: SessionDep,
    lab: Annotated[str | None, Query(description="Codigo del laboratorio costero")] = None,
    only_open: Annotated[bool, Query(description="Solo los episodios vigentes")] = False,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[AlertEventOut]:
    laboratory_id = None
    if lab is not None:
        laboratorio = labs_repo.get_by_code(session, lab)
        if laboratorio is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No existe un laboratorio con el codigo '{lab}'.",
            )
        laboratory_id = laboratorio.id

    eventos = alerts_repo.list_events(
        session, laboratory_id=laboratory_id, only_open=only_open, limit=limit
    )
    return [AlertEventOut.from_event(e) for e in eventos]


@router.post(
    "/api/alerts/evaluate",
    response_model=EvaluationSummaryOut,
    summary="Recalcula los episodios de todas las zonas",
)
def evaluate_alerts(
    session: SessionDep, config: EffectiveSettingsDep, admin: AdminUser
) -> EvaluationSummaryOut:
    resumen = alert_service.evaluate(session, config)

    # Los avisos se REGISTRAN aqui pero no se envian: un servidor de correo
    # lento o caido no debe bloquear ni hacer fallar la evaluacion.
    avisos = notification_service.create_for_events(
        session,
        opened_ids=resumen.opened_event_ids,
        closed_ids=resumen.closed_event_ids,
    )

    return EvaluationSummaryOut(
        reference_date=resumen.reference_date,
        laboratories_evaluated=resumen.laboratories_evaluated,
        events_total=resumen.events_total,
        events_open=resumen.events_open,
        events_removed=resumen.events_removed,
        notifications_created=avisos,
    )


@router.get(
    "/api/laboratories/{code}/streaks",
    response_model=list[StreakOut],
    summary="Rachas detectadas en una zona, calculadas al vuelo",
)
def laboratory_streaks(
    code: str, session: SessionDep, config: EffectiveSettingsDep
) -> list[StreakOut]:
    laboratorio = labs_repo.get_by_code(session, code)
    if laboratorio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un laboratorio con el codigo '{code}'.",
        )

    serie = readings_repo.series(session, laboratorio.id)
    return [
        StreakOut(
            state=r.state.value,
            started_on=r.started_on,
            ended_on=r.ended_on,
            length=r.length,
            peak_anomaly_c=r.peak_anomaly_c,
        )
        for r in detect_streaks(serie, config.streak_config)
    ]


@router.post(
    "/api/notifications/send",
    response_model=SendSummaryOut,
    summary="Envia los avisos pendientes por correo",
)
def send_notifications(
    session: SessionDep, mailer: MailerDep, admin: AdminUser, limit: int = 200
) -> SendSummaryOut:
    """Segundo paso del envio. Reintenta tambien los que fallaron antes."""
    resumen = notification_service.send_pending(session, mailer, limit=limit)
    return SendSummaryOut(
        attempted=resumen.attempted,
        sent=resumen.sent,
        failed=resumen.failed,
        by_status=notifications_repo.count_by_status(session),
    )
