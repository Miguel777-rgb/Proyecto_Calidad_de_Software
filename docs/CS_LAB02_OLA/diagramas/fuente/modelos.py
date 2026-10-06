"""Clases de db.models para las figuras 1b (antes) y 2b (después)."""

from __future__ import annotations

from uml_svg import Caja


def clases_models(despues: bool) -> list[Caja]:
    cajas = [
        Caja("base", "Base", "DeclarativeBase", tipo="class"),
        Caja("user_role", "UserRole", "enum", tipo="enum"),
        Caja("user", "User", "entity", tipo="entity", operaciones=[
            "+ is_admin(): bool {property}", "+ __repr__(): str"]),
        Caja("import_status", "ImportStatus", "enum", tipo="enum"),
        Caja("anomaly_reading", "AnomalyReading", "entity", tipo="entity", operaciones=["+ __repr__(): str"]),
        Caja("import_run", "ImportRun", "entity", tipo="entity", operaciones=["+ __repr__(): str"]),
        Caja("app_setting", "AppSetting", "entity", tipo="entity", operaciones=["+ __repr__(): str"]),
        Caja("laboratory", "Laboratory", "entity", tipo="entity", atributos=[
            "+ id: int {PK}",
            "+ code: str {unique}",
            "+ name: str",
            "+ latitude: Decimal",
            "+ longitude: Decimal",
            "+ is_active: bool",
            "+ created_at: datetime",
            "+ readings: list[AnomalyReading]",
        ], operaciones=["+ __repr__(): str"]),
        Caja("alert_state", "AlertState", "enum", tipo="enum", atributos=[
            "WARM = 'warm'", "COLD = 'cold'"], hallazgos=["H-09"]),
        Caja("alert_event", "AlertEvent", "entity", tipo="entity", atributos=[
            "+ id: int {PK}",
            "+ laboratory_id: int {FK}",
            "+ state: AlertState",
            "+ started_on: date",
            "+ ended_on: date",
            "+ streak_length: int",
            "+ peak_anomaly_c: Decimal",
            "+ threshold_c: Decimal",
            "+ min_streak_records: int",
            "+ max_gap_days: int",
            "+ is_open: bool",
            "+ detected_at: datetime",
            "+ laboratory: Laboratory",
            "{unique: laboratory_id, state, started_on}",
        ], operaciones=["+ __repr__(): str"], max_car=44),
        Caja("subscription", "Subscription", "entity", tipo="entity", atributos=[
            "+ id: int {PK}",
            "+ user_id: int {FK}",
            "+ laboratory_id: int {FK}",
            "+ created_at: datetime",
            "+ laboratory: Laboratory",
            "+ user: User",
            "{unique: user_id, laboratory_id}",
        ], operaciones=["+ __repr__(): str"]),
        Caja("notification", "Notification", "entity", tipo="entity", atributos=[
            "+ id: int {PK}",
            "+ alert_event_id: int {FK}",
            "+ user_id: int {FK}",
            "+ channel: NotificationChannel",
            "+ kind: NotificationKind",
            "+ status: NotificationStatus = PENDING",
            "+ error: str | None",
            "+ created_at: datetime",
            "+ sent_at: datetime | None",
            "+ read_at: datetime | None",
            "+ alert_event: AlertEvent",
            "+ user: User",
            "{unique: alert_event_id, user_id, channel, kind}",
        ], operaciones=["+ __repr__(): str"], hallazgos=["H-11"], max_car=48),
    ]
    for ident, nombre, valores in (
        ("notification_channel", "NotificationChannel", ["EMAIL = 'email'", "IN_APP = 'in_app'"]),
        ("notification_kind", "NotificationKind", ["OPENED = 'opened'", "CLOSED = 'closed'"]),
        ("notification_status", "NotificationStatus", ["PENDING = 'pending'", "SENT = 'sent'", "FAILED = 'failed'"]),
    ):
        cajas.append(Caja(ident, nombre, "enum", tipo="enum", atributos=valores))
    return cajas
