# El entorno virtual vive en /opt/venv, fuera de /app, para que el montaje
# del codigo fuente en desarrollo no lo sobrescriba.

FROM python:3.13-slim AS base
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app/src \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

# --- Dependencias de desarrollo (incluye pytest, ruff, mypy) --------------
FROM base AS deps-dev
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-install-project --all-groups

# --- Dependencias de produccion (sin herramientas de prueba) --------------
FROM base AS deps-prod
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-install-project --no-dev

# --- Imagen de desarrollo: recarga automatica al guardar ------------------
FROM base AS development
COPY --from=deps-dev /opt/venv /opt/venv
COPY . .
EXPOSE 8000
CMD ["uvicorn", "ola.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --- Imagen de produccion: usuario sin privilegios, sin recarga -----------
FROM base AS production
COPY --from=deps-prod /opt/venv /opt/venv
COPY . .
RUN useradd --create-home --uid 1000 ola && chown -R ola:ola /app && \
    chmod +x /app/entrypoint.sh
USER ola
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health').status==200 else 1)"
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "ola.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
