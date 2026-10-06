"""Contenido UML de los diagramas: miembros exactos de cada unidad (coinciden con NOM).

Firmas sin el parámetro `session` ni tipos de parámetros; visibilidad UML:
+ público, − privado (nombre con guion bajo).
"""

from __future__ import annotations

from uml_svg import Caja

# ---------------------------------------------------------------- comunes a ambos diseños


def routers_alerts(despues: bool) -> Caja:
    envio = ("+ send_notifications(channels, admin, limit): SendSummaryOut" if despues
             else "+ send_notifications(mailer, admin, limit): SendSummaryOut")
    return Caja("routers_alerts", "api.routers.alerts", "module", operaciones=[
        "+ list_alerts(lab, only_open, limit): list[AlertEventOut]",
        "+ evaluate_alerts(config, admin): EvaluationSummaryOut",
        "+ laboratory_streaks(code, config): list[StreakOut]",
        envio,
    ], hallazgos=["H-10"], nota="NOM 4 · Ce 10 · Ca 1", estado="modificado" if despues else None)


def routers_subs() -> Caja:
    return Caja("routers_subs", "api.routers.subscriptions", "module", operaciones=[
        "+ list_subscriptions(user): list[SubscriptionOut]",
        "+ add_subscription(datos, user): SubscriptionOut",
        "+ remove_subscription(code, user): None",
        "+ list_notifications(user, only_unread): NotificationListOut",
        "+ mark_read(notification_id, user): None",
        "+ mark_all_read(user): None",
    ], hallazgos=["H-10", "H-12"], nota="NOM 6 · Ce 6 · Ca 1")


def deps(despues: bool) -> Caja:
    atributos = [
        "+ bearer_scheme: HTTPBearer",
        "+ CREDENCIALES_INVALIDAS: HTTPException",
        "+ SessionDep: Annotated[Session]",
        "+ SettingsDep: Annotated[Settings]",
        "+ CurrentUser: Annotated[User]",
        "+ AdminUser: Annotated[User]",
        "+ EffectiveSettingsDep: Annotated[EffectiveSettings]",
        "+ MailerDep: Annotated[Mailer]",
    ]
    operaciones = [
        "+ get_current_user(settings, credentials): User",
        "+ require_admin(user): User",
        "+ get_effective_settings(settings): EffectiveSettings",
        "+ get_mailer(settings): Mailer",
    ]
    if despues:
        atributos.append("+ ChannelsDep: Annotated[ChannelRegistry]")
        operaciones.append("+ get_channels(mailer): ChannelRegistry")
    return Caja("deps", "api.deps", "module", atributos=atributos, operaciones=operaciones,
                nota="NOM 5 · Ce 8 · Ca 9" if despues else "NOM 4 · Ce 7 · Ca 9",
                estado="modificado" if despues else None, max_car=54)


def alert_service() -> list[Caja]:
    return [
        Caja("alert_service", "alert_service", "module", operaciones=[
            "− _to_alert_state(state): AlertState",
            "− _sync_lab_events(laboratory_id, streaks, open_streak, config): int",
            "+ evaluate(config): EvaluationSummary",
        ], hallazgos=["H-06"], nota="NOM 3 · Ce 8 · Ca 1"),
        Caja("evaluation_summary", "EvaluationSummary", "dataclass", tipo="dataclass", atributos=[
            "+ reference_date: date | None",
            "+ laboratories_evaluated: int",
            "+ events_total: int",
            "+ events_open: int",
            "+ events_removed: int",
            "+ opened_event_ids: tuple[int, ...]",
            "+ closed_event_ids: tuple[int, ...]",
        ]),
    ]


def repos(despues: bool) -> list[Caja]:
    alerts_ops = [
        "+ list_events(laboratory_id, only_open, limit): list[AlertEvent]",
        "+ open_events(): dict[int, AlertEvent]",
    ]
    if despues:
        alerts_ops += ["+ laboratories_of(event_ids): list[tuple[int, int]]",
                       "+ open_event_ids(laboratory_id): list[int]"]
    alerts_ops.append("+ delete_all(): int")
    return [
        Caja("alerts_repo", "alerts_repo", "module", operaciones=alerts_ops,
             nota="NOM 5 · Ce 1 · Ca 4" if despues else "NOM 3 · Ce 1 · Ca 3",
             estado="modificado" if despues else None),
        Caja("subscriptions_repo", "subscriptions_repo", "module", operaciones=[
            "+ list_for_user(user_id): list[Subscription]",
            "+ get(user_id, laboratory_id): Subscription | None",
            "+ add(user_id, laboratory_id): Subscription",
            "+ remove(user_id, laboratory_id): bool",
            "+ subscribers_of(laboratory_id): list[int]",
        ], nota="NOM 5 · Ce 1 · Ca 2"),
    ]


def dominio_comun() -> list[Caja]:
    return [
        Caja("streaks", "streaks", "module", operaciones=[
            "− _runs(readings, config): Iterator[_Run]",
            "+ detect_streaks(readings, config): list[Streak]",
        ], nota="NOM 3 · Ce 2 · Ca 2"),
        Caja("run", "_Run", "dataclass", tipo="dataclass", atributos=[
            "+ state: ThermalState",
            "+ readings: list[Reading]",
        ], operaciones=["+ to_streak(): Streak"]),
        Caja("streak", "Streak", "dataclass", tipo="dataclass", atributos=[
            "+ state: ThermalState",
            "+ started_on: date",
            "+ ended_on: date",
            "+ length: int",
            "+ peak_anomaly_c: Decimal",
        ]),
        Caja("messages", "messages", "module", atributos=[
            "+ ESTADOS: dict[str, str]",
            "+ ESTADOS_SUSTANTIVO: dict[str, str]",
            "+ ATRIBUCION: str",
            "+ DESCARGO: str",
        ], operaciones=[
            "− _pie(zona): str",
            "+ alert_opened(zona, state, started_on, streak_length, peak_anomaly_c): AlertMessage",
            "+ alert_closed(zona, state, started_on, ended_on): AlertMessage",
        ], hallazgos=["H-09"], nota="NOM 3 · Ce 0 · Ca 1", max_car=44),
        Caja("alert_message", "AlertMessage", "dataclass", tipo="dataclass", atributos=[
            "+ subject: str", "+ body: str"]),
        Caja("email", "Email", "dataclass", tipo="dataclass", atributos=[
            "+ to: str", "+ subject: str", "+ body: str"]),
        Caja("mailer", "Mailer", "protocol", tipo="protocol", cursiva=True, operaciones=[
            "+ send(email): None"]),
        Caja("smtp_mailer", "SmtpMailer", "class", tipo="class", atributos=[
            "− _settings: Settings"], operaciones=[
            "+ __init__(settings)", "+ send(email): None"], hallazgos=["H-07"]),
        Caja("recording_mailer", "RecordingMailer", "class", tipo="class", atributos=[
            "+ sent: list[Email]", "− _fail_with: Exception | None"], operaciones=[
            "+ __init__(fail_with)", "+ send(email): None"], hallazgos=["H-08"]),
        Caja("clock", "Clock", "protocol", tipo="protocol", cursiva=True, operaciones=[
            "+ now(): datetime"]),
        Caja("system_clock", "SystemClock", "class", tipo="class", operaciones=[
            "+ now(): datetime"]),
        Caja("fixed_clock", "FixedClock", "class", tipo="class", atributos=[
            "− _moment: datetime"], operaciones=["+ __init__(moment)", "+ now(): datetime"]),
        Caja("settings", "config.Settings", "fuera del alcance", tipo="stub", atributos=[
            "21 campos; SmtpMailer usa 6"]),
        Caja("session", "Session", "externo · SQLAlchemy", tipo="external", operaciones=[
            "+ execute(stmt) · scalars(stmt)", "+ commit() · flush()"]),
    ]


def entidades_compactas(despues: bool) -> list[Caja]:
    return [
        Caja("laboratory", "Laboratory", "entity", tipo="entity"),
        Caja("alert_event", "AlertEvent", "entity", tipo="entity"),
        Caja("subscription", "Subscription", "entity", tipo="entity"),
        Caja("notification", "Notification", "entity", tipo="entity", hallazgos=["H-11"]),
    ]


# ---------------------------------------------------------------- diseño actual


def notification_service_antes() -> list[Caja]:
    return [
        Caja("notification_service", "notification_service", "module", atributos=[
            "+ CANALES: tuple = (EMAIL, IN_APP)",
        ], operaciones=[
            "− _eventos(ids): list[AlertEvent]",
            "+ create_for_events(opened_ids, closed_ids): int",
            "+ notify_open_alerts_of(user_id, laboratory_id): int",
            "− _mensaje(notificacion): AlertMessage",
            "+ send_pending(mailer, limit): SendSummary",
            "+ mark_read(notification_id, user_id): bool",
            "+ mark_all_read(user_id): int",
        ], hallazgos=["H-01", "H-02", "H-03", "H-04", "H-05", "H-12"],
            nota="NOM 7 · Ce 5 · Ca 2"),
        Caja("send_summary", "SendSummary", "dataclass", tipo="dataclass", atributos=[
            "+ attempted: int", "+ sent: int", "+ failed: int"]),
    ]


def notifications_repo_antes() -> Caja:
    return Caja("notifications_repo", "notifications_repo", "module", operaciones=[
        "+ list_for_user(user_id, only_unread, limit): list[Notification]",
        "+ count_unread(user_id): int",
        "+ get_for_user(notification_id, user_id): Notification | None",
        "+ pending_emails(limit): list[Notification]",
        "+ count_by_status(): dict[str, int]",
    ], hallazgos=["H-02"], nota="NOM 5 · Ce 1 · Ca 3")


# ---------------------------------------------------------------- diseño propuesto


def notification_service_despues() -> Caja:
    return Caja("notification_service", "notification_service", "module", atributos=[
        "+ CANALES: tuple = tuple(NotificationChannel)",
    ], operaciones=[
        "+ create_for_events(opened_ids, closed_ids): int",
        "+ notify_open_alerts_of(user_id, laboratory_id): int",
        "+ dispatch_pending(channels, limit, clock): SendSummary",
        "+ send_pending(mailer, limit, clock): SendSummary",
        "+ mark_read(notification_id, user_id, clock): bool",
        "+ mark_all_read(user_id, clock): int",
    ], hallazgos=["H-12"], estado="modificado", insignia=False, nota="NOM 6 · Ce 8 · Ca 2")


def dispatcher() -> list[Caja]:
    n = dict(estado="nuevo", insignia=False)
    return [
        Caja("dispatcher_mod", "notification_dispatcher", "module", atributos=[
            "+ MAX_ERROR_LENGTH: int = 500"], **n),
        Caja("store", "NotificationStore", "protocol", tipo="protocol", cursiva=True, operaciones=[
            "+ pending(channels, limit): list[OutboundNotice]",
            "+ mark_sent(notice_id, at): None",
            "+ mark_failed(notice_id, reason): None",
        ], **n),
        Caja("send_summary", "SendSummary", "dataclass", tipo="dataclass", atributos=[
            "+ attempted: int", "+ sent: int", "+ failed: int"], **n),
        Caja("dispatcher", "NotificationDispatcher", "class", tipo="class", atributos=[
            "− _store: NotificationStore",
            "− _channels: ChannelRegistry",
            "− _clock: Clock",
        ], operaciones=[
            "+ __init__(store, channels, clock)",
            "+ send_pending(limit): SendSummary",
        ], **n),
    ]


def canales() -> list[Caja]:
    n = dict(estado="nuevo", insignia=False)
    return [
        Caja("channel", "Channel", "protocol", tipo="protocol", cursiva=True, operaciones=[
            "+ code: NotificationChannel {property}",
            "+ requires_dispatch: bool {property}",
            "+ deliver(notice): None",
        ], **n),
        Caja("email_channel", "EmailChannel", "class", tipo="class", atributos=[
            "+ code = EMAIL", "+ requires_dispatch = True", "− _mailer: Mailer",
        ], operaciones=["+ __init__(mailer)", "+ deliver(notice): None"], **n),
        Caja("inapp_channel", "InAppChannel", "class", tipo="class", atributos=[
            "+ code = IN_APP", "+ requires_dispatch = False",
        ], operaciones=["+ deliver(notice): None"], **n),
        Caja("registry", "ChannelRegistry", "class", tipo="class", atributos=[
            "− _by_code: dict[NotificationChannel, Channel]",
        ], operaciones=[
            "+ __init__(channels)",
            "+ codes(): tuple[NotificationChannel, ...]",
            "+ dispatchable(): tuple[Channel, ...]",
            "+ get(code): Channel",
        ], **n),
        Caja("dup_error", "DuplicateChannelError", "exception · ValueError", tipo="class",
             operaciones=["+ __init__(code)"], **n),
        Caja("unk_error", "UnknownChannelError", "exception · LookupError", tipo="class",
             operaciones=["+ __init__(code)"], **n),
        Caja("channels_mod", "channels", "module", operaciones=[
            "+ default_channels(mailer): ChannelRegistry"], **n),
    ]


def notices() -> list[Caja]:
    n = dict(estado="nuevo", insignia=False)
    return [
        Caja("n_channel", "NotificationChannel", "enum", tipo="enum", atributos=[
            "EMAIL = 'email'", "IN_APP = 'in_app'"], **n),
        Caja("n_kind", "NotificationKind", "enum", tipo="enum", atributos=[
            "OPENED = 'opened'", "CLOSED = 'closed'"], **n),
        Caja("n_status", "NotificationStatus", "enum", tipo="enum", atributos=[
            "PENDING = 'pending'", "SENT = 'sent'", "FAILED = 'failed'"], **n),
        Caja("pending_row", "PendingRow", "namedtuple", tipo="dataclass", atributos=[
            "+ alert_event_id: int", "+ user_id: int",
            "+ channel: NotificationChannel", "+ kind: NotificationKind"], **n),
        Caja("alert_facts", "AlertFacts", "dataclass", tipo="dataclass", atributos=[
            "+ zona: str", "+ state: str", "+ started_on: date", "+ ended_on: date",
            "+ streak_length: int", "+ peak_anomaly_c: Decimal"], **n),
        Caja("recipient", "Recipient", "dataclass", tipo="dataclass", atributos=[
            "+ user_id: int", "+ email: str"], **n),
        Caja("outbound", "OutboundNotice", "dataclass", tipo="dataclass", atributos=[
            "+ id: int", "+ channel: NotificationChannel", "+ recipient: Recipient",
            "+ message: AlertMessage"], **n),
        Caja("notices_mod", "notices", "module", atributos=[
            "+ COMPOSERS: dict[NotificationKind, Callable]",
        ], operaciones=[
            "+ plan_rows(pairs, kind, channels): list[PendingRow]",
            "− _opened(facts): AlertMessage",
            "− _closed(facts): AlertMessage",
            "+ compose(kind, facts): AlertMessage",
        ], **n),
    ]


def notifications_repo_despues() -> list[Caja]:
    return [
        Caja("notifications_repo", "notifications_repo", "module", operaciones=[
            "+ list_for_user(user_id, only_unread, limit): list[Notification]",
            "+ count_unread(user_id): int",
            "+ get_for_user(notification_id, user_id): Notification | None",
            "+ insert_pending(rows): int",
            "− _to_notice(notificacion): OutboundNotice",
            "+ count_by_status(): dict[str, int]",
        ], estado="modificado", insignia=False),
        Caja("sql_store", "SqlNotificationStore", "class", tipo="class", atributos=[
            "− _session: Session",
        ], operaciones=[
            "+ __init__(session)",
            "+ pending(channels, limit): list[OutboundNotice]",
            "− _get(notice_id): Notification",
            "+ mark_sent(notice_id, at): None",
            "+ mark_failed(notice_id, reason): None",
        ], estado="nuevo"),
    ]
