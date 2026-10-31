"""Cabeceras de seguridad de la API (ola.security_headers).

En produccion, Traefik manda /api directo a la API, sin pasar por el Nginx de
la web: si la API no las pone, sus respuestas salen sin ninguna.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from ola.main import create_app
from ola.security_headers import (
    CABECERAS,
    CSP_API,
    CSP_DOCUMENTACION,
    SecurityHeadersMiddleware,
)


@pytest.fixture
def cliente(settings_factory) -> TestClient:
    # Sin `with`: no corre el arranque, que buscaria la base de datos.
    return TestClient(create_app(settings_factory()))


def directiva(csp: str, nombre: str) -> list[str]:
    for parte in csp.split(";"):
        palabras = parte.split()
        if palabras and palabras[0] == nombre:
            return palabras[1:]
    return []


def recursos_externos(html: str) -> list[tuple[str, str]]:
    """(directiva, origen) de cada script, hoja de estilos e icono externo."""
    pares = [("script-src", src) for src in re.findall(r'<script[^>]*\ssrc="([^"]+)"', html)]
    for etiqueta in re.findall(r"<link[^>]*>", html):
        href = re.search(r'href="([^"]+)"', etiqueta)
        if href is not None:
            pares.append(("style-src" if "stylesheet" in etiqueta else "img-src", href.group(1)))
    return [
        (nombre, f"{url.scheme}://{url.netloc}")
        for nombre, url in ((n, urlparse(u)) for n, u in pares)
        if url.scheme in ("http", "https")
    ]


class TestRespuestasDeLaApi:
    @pytest.mark.parametrize("ruta", ["/api/health", "/api/openapi.json", "/api/no-existe"])
    def test_llevan_todas_las_cabeceras(self, cliente, ruta):
        respuesta = cliente.get(ruta)

        for nombre, valor in CABECERAS.items():
            assert respuesta.headers[nombre] == valor
        assert respuesta.headers["Content-Security-Policy"] == CSP_API

    def test_el_json_no_carga_nada_ni_se_puede_incrustar(self):
        assert directiva(CSP_API, "default-src") == ["'none'"]
        assert directiva(CSP_API, "frame-ancestors") == ["'none'"]

    def test_tambien_la_consulta_previa_que_contesta_cors(self, cliente):
        respuesta = cliente.options(
            "/api/health",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
        )

        assert respuesta.status_code == 200
        assert respuesta.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
        assert respuesta.headers["X-Content-Type-Options"] == "nosniff"
        assert respuesta.headers["Content-Security-Policy"] == CSP_API


class TestDocumentacion:
    @pytest.mark.parametrize("ruta", ["/api/docs", "/redoc"])
    def test_la_politica_admite_lo_que_carga_la_pagina(self, cliente, ruta):
        # Se lee la pagina que genera FastAPI: si cambia de CDN, esto falla
        # antes de que la documentacion quede en blanco en produccion.
        respuesta = cliente.get(ruta)

        assert respuesta.status_code == 200
        assert respuesta.headers["Content-Security-Policy"] == CSP_DOCUMENTACION
        recursos = recursos_externos(respuesta.text)
        assert recursos, "la pagina deberia cargar recursos externos"
        for nombre, origen in recursos:
            assert origen in directiva(CSP_DOCUMENTACION, nombre), (nombre, origen)

    def test_swagger_ui_arranca_con_un_script_en_linea(self, cliente):
        html = cliente.get("/api/docs").text

        assert re.search(r"<script>\s*\S", html)
        assert "'unsafe-inline'" in directiva(CSP_DOCUMENTACION, "script-src")

    def test_nadie_la_puede_incrustar(self, cliente):
        respuesta = cliente.get("/api/docs")

        assert respuesta.headers["X-Frame-Options"] == "DENY"
        assert directiva(CSP_DOCUMENTACION, "frame-ancestors") == ["'none'"]


def test_no_pisa_las_cabeceras_que_ya_trae_la_respuesta():
    async def pagina(_: Request) -> PlainTextResponse:
        return PlainTextResponse("ok", headers={"X-Frame-Options": "SAMEORIGIN"})

    app = SecurityHeadersMiddleware(Starlette(routes=[Route("/", pagina)]))
    # Con `with` corre tambien el arranque, que el middleware deja pasar.
    with TestClient(app) as cliente:
        respuesta = cliente.get("/")

    assert respuesta.headers["X-Frame-Options"] == "SAMEORIGIN"
    assert respuesta.headers["X-Content-Type-Options"] == "nosniff"
