"""Cabeceras de seguridad de todas las respuestas de la API.

En produccion, Traefik manda las rutas /api directo a este proceso, sin pasar
por el Nginx de la web, asi que las cabeceras de frontend/seguridad.conf no le
llegan. Este middleware agrega las mismas, con una politica de contenido
propia: el JSON de la API no carga nada, y las paginas de documentacion
(Swagger UI en /api/docs, ReDoc en /redoc) traen su codigo de jsDelivr.

Un error no controlado lo responde Starlette por fuera de los middleware: ese
500, un texto plano, sale sin estas cabeceras.
"""

from __future__ import annotations

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Las mismas de la web, salvo que ninguna respuesta de la API se muestra
# dentro de otra pagina, ni siquiera del mismo dominio.
CABECERAS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    # Solo cuenta por HTTPS; por HTTP, como en desarrollo, el navegador la ignora.
    "Strict-Transport-Security": "max-age=31536000",
}

# El JSON no ejecuta ni carga nada: se niega todo, como recomienda OWASP para
# las API REST.
CSP_API = "default-src 'none'; frame-ancestors 'none'"

# Swagger UI y ReDoc cargan su codigo y sus estilos de jsDelivr y los arrancan
# con un script en linea; ReDoc usa ademas fuentes de Google, un worker blob:
# para buscar y su logo de cdn.redoc.ly. La politica impide incrustarlas y
# conectarse a otros sitios, pero no protege de un paquete comprometido en
# jsDelivr: en produccion /api/docs comparte dominio con la web, que guarda la
# sesion en localStorage. Para eso habria que no publicar la documentacion.
CSP_DOCUMENTACION = "; ".join(
    [
        "default-src 'none'",
        "script-src 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
        "font-src https://fonts.gstatic.com",
        "img-src 'self' data: https://fastapi.tiangolo.com https://cdn.redoc.ly",
        "connect-src 'self'",
        "worker-src blob:",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'",
    ]
)


class SecurityHeadersMiddleware:
    """Agrega las cabeceras a cada respuesta HTTP sin pisar las que ya traiga."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def enviar(message: Message) -> None:
            if message["type"] == "http.response.start":
                cabeceras = MutableHeaders(scope=message)
                for nombre, valor in CABECERAS.items():
                    cabeceras.setdefault(nombre, valor)
                # Solo la documentacion responde HTML; todo lo demas es JSON.
                es_html = cabeceras.get("content-type", "").startswith("text/html")
                cabeceras.setdefault(
                    "Content-Security-Policy", CSP_DOCUMENTACION if es_html else CSP_API
                )
            await send(message)

        await self.app(scope, receive, enviar)
