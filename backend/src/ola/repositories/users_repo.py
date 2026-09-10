"""Acceso a datos de usuarios."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ola.db.models import User, UserRole


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_by_email(session: Session, email: str) -> User | None:
    return session.scalar(select(User).where(User.email == normalize_email(email)))


def get_by_id(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)


def create(
    session: Session,
    *,
    email: str,
    password_hash: str,
    full_name: str | None = None,
    role: UserRole = UserRole.USER,
) -> User:
    user = User(
        email=normalize_email(email),
        password_hash=password_hash,
        full_name=full_name,
        role=role,
    )
    session.add(user)
    session.flush()
    return user
