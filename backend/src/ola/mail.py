"""Envio de correo (RF-03).

En desarrollo apunta a Mailpit, que captura los mensajes sin sacarlos a
internet. En produccion se configura un servidor real desde el .env.
"""

from __future__ import annotations

import smtplib
from dataclasses import dataclass
from email.message import EmailMessage as MimeMessage
from typing import Protocol

from ola.config import Settings


@dataclass(frozen=True)
class Email:
    to: str
    subject: str
    body: str


class Mailer(Protocol):
    def send(self, email: Email) -> None: ...


class SmtpMailer:
    """Envia por SMTP. Lanza la excepcion si falla; quien llama la registra."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def send(self, email: Email) -> None:
        mensaje = MimeMessage()
        mensaje["From"] = self._settings.mail_from
        mensaje["To"] = email.to
        mensaje["Subject"] = email.subject
        mensaje.set_content(email.body)

        with smtplib.SMTP(self._settings.smtp_host, self._settings.smtp_port, timeout=15) as smtp:
            if self._settings.smtp_tls:
                smtp.starttls()
            if self._settings.smtp_user:
                smtp.login(self._settings.smtp_user, self._settings.smtp_password)
            smtp.send_message(mensaje)


class RecordingMailer:
    """Guarda los mensajes en memoria en lugar de enviarlos. Para pruebas."""

    def __init__(self, *, fail_with: Exception | None = None) -> None:
        self.sent: list[Email] = []
        self._fail_with = fail_with

    def send(self, email: Email) -> None:
        if self._fail_with is not None:
            raise self._fail_with
        self.sent.append(email)
