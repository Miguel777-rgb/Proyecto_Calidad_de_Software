"""Configuracion de la aplicacion, leida de variables de entorno con prefijo OLA_."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="OLA_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"
    database_url: str = "postgresql+psycopg://ola:ola@db:5432/ola"

    jwt_secret: str = "inseguro-solo-para-desarrollo"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60

    admin_email: str = "admin@ola.pe"
    admin_password: str = "cambiar"

    # Reglas de dominio. Son los valores iniciales: el administrador puede
    # ajustarlos en caliente desde la aplicacion (tabla app_settings).
    threshold_c: float = Field(default=0.5, gt=0)
    min_streak_records: int = Field(default=5, ge=2)
    max_gap_days: int = Field(default=2, ge=0)
    freshness_days: int = Field(default=7, ge=1)
    projection_window_days: int = Field(default=30, ge=5)
    projection_horizon_days: int = Field(default=5, ge=1, le=7)

    smtp_host: str = "mailpit"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_tls: bool = False
    mail_from: str = "alertas@ola.pe"

    # NoDecode evita que pydantic-settings intente leer la variable de
    # entorno como JSON: aqui llega separada por comas.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
