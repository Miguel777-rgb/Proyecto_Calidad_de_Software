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
