"""Suscripciones a zonas de interes (RF-07) y avisos recibidos (RF-03)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ola.api.deps import CurrentUser, SessionDep
from ola.api.schemas.notifications import (
    NotificationListOut,
    NotificationOut,
    SubscriptionIn,
    SubscriptionOut,
)
from ola.repositories import labs_repo, notifications_repo, subscriptions_repo
from ola.services import notification_service

router = APIRouter(tags=["suscripciones"])


@router.get(
    "/api/subscriptions", response_model=list[SubscriptionOut], summary="Mis zonas de interes"
)
def list_subscriptions(session: SessionDep, user: CurrentUser) -> list[SubscriptionOut]:
    return [
        SubscriptionOut.from_subscription(s)
        for s in subscriptions_repo.list_for_user(session, user.id)
    ]


@router.post(
    "/api/subscriptions",
    response_model=SubscriptionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Suscribirse a una zona",
)
def add_subscription(
    datos: SubscriptionIn, session: SessionDep, user: CurrentUser
) -> SubscriptionOut:
    laboratorio = labs_repo.get_by_code(session, datos.laboratory_code)
    if laboratorio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un laboratorio con el codigo '{datos.laboratory_code}'.",
        )
    # Suscribirse dos veces a la misma zona no es un error: se devuelve la
    # suscripcion que ya existia.
    suscripcion = subscriptions_repo.add(session, user.id, laboratorio.id)
    # Si la zona ya esta en alerta, se avisa de inmediato: de otro modo la
    # persona no se enteraria hasta que el episodio terminara.
    notification_service.notify_open_alerts_of(session, user.id, laboratorio.id)
    session.commit()
    session.refresh(suscripcion)
    return SubscriptionOut.from_subscription(suscripcion)


@router.delete(
    "/api/subscriptions/{code}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Darse de baja de una zona",
)
def remove_subscription(code: str, session: SessionDep, user: CurrentUser) -> None:
    laboratorio = labs_repo.get_by_code(session, code)
    if laboratorio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un laboratorio con el codigo '{code}'.",
        )
    if not subscriptions_repo.remove(session, user.id, laboratorio.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No estabas suscrito a esa zona."
        )
    session.commit()


@router.get("/api/notifications", response_model=NotificationListOut, summary="Mis avisos")
def list_notifications(
    session: SessionDep, user: CurrentUser, only_unread: bool = False
) -> NotificationListOut:
    avisos = notifications_repo.list_for_user(session, user.id, only_unread=only_unread)
    return NotificationListOut(
        unread=notifications_repo.count_unread(session, user.id),
        items=[NotificationOut.from_notification(a) for a in avisos],
    )


@router.post(
    "/api/notifications/{notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marcar un aviso como leido",
)
def mark_read(notification_id: int, session: SessionDep, user: CurrentUser) -> None:
    if not notification_service.mark_read(session, notification_id, user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No existe ese aviso.")


@router.post(
    "/api/notifications/read-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marcar todos los avisos como leidos",
)
def mark_all_read(session: SessionDep, user: CurrentUser) -> None:
    notification_service.mark_all_read(session, user.id)
