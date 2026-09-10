"""Endpoints de salud: los usan Docker, Dokploy y el arranque de las E2E."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from ola.main import create_app


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as c:
        yield c


def test_liveness_responde_ok_sin_tocar_la_base(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.integration
def test_readiness_confirma_que_la_base_responde(client):
    r = client.get("/api/health/ready")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": "ok"}


def test_documentacion_openapi_disponible(client):
    r = client.get("/api/openapi.json")
    assert r.status_code == 200
    assert r.json()["info"]["version"] == "0.1.0"
