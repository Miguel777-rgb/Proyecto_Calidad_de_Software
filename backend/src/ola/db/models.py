"""Modelos SQLAlchemy de OLA."""

from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base declarativa comun. Alembic lee su metadata para autogenerar."""


class UserRole(enum.StrEnum):
    ADMIN = "admin"
    USER = "user"


class User(Base):
    """Usuario del sistema (RF-07).

    El correo se guarda siempre en minusculas para que la unicidad no dependa
    de como lo escriba la persona al registrarse.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(120))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        default=UserRole.USER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    @property
    def is_admin(self) -> bool:
        return self.role is UserRole.ADMIN

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role.value})>"


class ImportStatus(enum.StrEnum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Laboratory(Base):
    """Laboratorio costero del IMARPE (RF-04).

    El CSV no trae coordenadas, asi que el catalogo y su ubicacion se cargan
    por migracion. Los laboratorios NUNCA se crean al importar: una errata en
    el archivo generaria una zona fantasma y el mapa dejaria de tener 10.
    """

    __tablename__ = "laboratories"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    readings: Mapped[list[AnomalyReading]] = relationship(
        back_populates="laboratory", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Laboratory {self.code}>"


class AnomalyReading(Base):
    """Una medicion diaria de anomalia termica.

    Se usa Numeric y no Float para conservar los 4 decimales del dataset:
    en coma flotante, -1.9048 se guardaria como -1.9047999999999999.
    """

    __tablename__ = "anomaly_readings"
    __table_args__ = (
        # Esta restriccion es ademas el indice que resuelve las consultas
        # por laboratorio y rango de fechas (RF-05) con un solo recorrido.
        UniqueConstraint("laboratory_id", "measured_on", name="uq_reading_lab_date"),
        # Para la comparacion entre laboratorios en un mismo periodo (RF-06).
        Index("ix_reading_date_lab", "measured_on", "laboratory_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    laboratory_id: Mapped[int] = mapped_column(
        ForeignKey("laboratories.id", ondelete="CASCADE"), nullable=False
    )
    measured_on: Mapped[date] = mapped_column(Date, nullable=False)
    anomaly_c: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False)
    import_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("import_runs.id", ondelete="SET NULL")
    )

    laboratory: Mapped[Laboratory] = relationship(back_populates="readings")

    def __repr__(self) -> str:
        return f"<AnomalyReading {self.laboratory_id} {self.measured_on} {self.anomaly_c}>"


class ImportRun(Base):
    """Auditoria de cada importacion del CSV (RF-08).

    Deja constancia de quien cargo que archivo, cuando y con que resultado,
    que es parte de la trazabilidad que exige el curso.
    """

    __tablename__ = "import_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    byte_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[ImportStatus] = mapped_column(
        Enum(ImportStatus, name="import_status", values_callable=lambda e: [m.value for m in e]),
        default=ImportStatus.RUNNING,
        nullable=False,
    )
    rows_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rows_inserted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rows_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rows_unchanged: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rows_rejected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_sample: Mapped[list[dict[str, object]] | None] = mapped_column(JSONB)
    error_message: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    uploaded_by: Mapped[User | None] = relationship()

    def __repr__(self) -> str:
        return f"<ImportRun {self.id} {self.filename} {self.status}>"


class AlertState(enum.StrEnum):
    """Estados que pueden originar una alerta. Refleja ThermalState del dominio,
    limitado a los dos valores anomalos: una zona neutra nunca alerta.
    """

    WARM = "warm"
    COLD = "cold"


class AlertEvent(Base):
    """Episodio de anomalia sostenida detectado (RF-01).

    Guarda los parametros con los que se detecto, de modo que cambiar los
    umbrales no reescriba el pasado: el historico queda auditable y solo se
    reemplaza cuando el administrador reevalua explicitamente.
    """

    __tablename__ = "alert_events"
    __table_args__ = (
        # Hace idempotente volver a evaluar: no se duplican episodios.
        UniqueConstraint("laboratory_id", "state", "started_on", name="uq_alert_lab_state_start"),
        Index("ix_alert_open", "is_open", "laboratory_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    laboratory_id: Mapped[int] = mapped_column(
        ForeignKey("laboratories.id", ondelete="CASCADE"), nullable=False
    )
    state: Mapped[AlertState] = mapped_column(
        Enum(AlertState, name="alert_state", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    started_on: Mapped[date] = mapped_column(Date, nullable=False)
    ended_on: Mapped[date] = mapped_column(Date, nullable=False)
    streak_length: Mapped[int] = mapped_column(Integer, nullable=False)
    peak_anomaly_c: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False)

    # Instantanea de la configuracion usada al detectarlo.
    threshold_c: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    min_streak_records: Mapped[int] = mapped_column(Integer, nullable=False)
    max_gap_days: Mapped[int] = mapped_column(Integer, nullable=False)

    # Abierto = el episodio llega hasta la ultima medicion de la zona, asi que
    # la tendencia sigue vigente. Solo los abiertos notifican (RF-03).
    is_open: Mapped[bool] = mapped_column(default=False, nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    laboratory: Mapped[Laboratory] = relationship()

    def __repr__(self) -> str:
        return f"<AlertEvent {self.laboratory_id} {self.state} {self.started_on}>"


class AppSetting(Base):
    """Parametros que el administrador puede ajustar sin tocar el codigo."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    def __repr__(self) -> str:
        return f"<AppSetting {self.key}>"


class NotificationChannel(enum.StrEnum):
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationKind(enum.StrEnum):
    """Momento del episodio que motiva el aviso."""

    OPENED = "opened"
    CLOSED = "closed"


class NotificationStatus(enum.StrEnum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class Subscription(Base):
    """Zona de interes de un usuario (RF-07)."""

    __tablename__ = "subscriptions"
    __table_args__ = (
        UniqueConstraint("user_id", "laboratory_id", name="uq_subscription_user_lab"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    laboratory_id: Mapped[int] = mapped_column(
        ForeignKey("laboratories.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    laboratory: Mapped[Laboratory] = relationship()
    user: Mapped[User] = relationship()

    def __repr__(self) -> str:
        return f"<Subscription u{self.user_id} lab{self.laboratory_id}>"


class Notification(Base):
    """Aviso a un usuario por un episodio de alerta (RF-03).

    La restriccion de unicidad es la que impide repetir el mismo aviso: por
    mucho que se reevalue, un episodio genera un unico correo por usuario y
    momento. De ella depende que reevaluar mil veces no mande mil correos.
    """

    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint(
            "alert_event_id", "user_id", "channel", "kind", name="uq_notification_unica"
        ),
        Index("ix_notification_pendientes", "status", "channel"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_event_id: Mapped[int] = mapped_column(
        ForeignKey("alert_events.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(
            NotificationChannel,
            name="notification_channel",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    kind: Mapped[NotificationKind] = mapped_column(
        Enum(
            NotificationKind,
            name="notification_kind",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(
            NotificationStatus,
            name="notification_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=NotificationStatus.PENDING,
        nullable=False,
    )
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    alert_event: Mapped[AlertEvent] = relationship()
    user: Mapped[User] = relationship()

    def __repr__(self) -> str:
        return f"<Notification {self.id} {self.channel} {self.kind} {self.status}>"
