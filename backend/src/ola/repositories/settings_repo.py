"""Acceso a los parametros ajustables por el administrador."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ola.db.models import AppSetting


def get_all(session: Session) -> dict[str, object]:
    filas = session.execute(select(AppSetting.key, AppSetting.value)).all()
    return {clave: valor["value"] for clave, valor in filas}


def put(session: Session, key: str, value: object, *, updated_by_id: int | None = None) -> None:
    ajuste = session.get(AppSetting, key)
    if ajuste is None:
        session.add(AppSetting(key=key, value={"value": value}, updated_by_id=updated_by_id))
    else:
        ajuste.value = {"value": value}
        ajuste.updated_by_id = updated_by_id
