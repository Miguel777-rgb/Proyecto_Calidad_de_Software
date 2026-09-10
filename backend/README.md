# Backend de OLA

API REST en **FastAPI** que clasifica la anomalía térmica del mar por laboratorio costero,
detecta tendencias sostenidas y expone los datos al frontend.

## Estructura

```text
src/ola/
├── config.py        Configuración leída de variables OLA_*
├── clock.py         Reloj inyectable (SystemClock / FixedClock)
├── main.py          Fábrica de la aplicación FastAPI
├── domain/          Lógica pura: sin base de datos, sin FastAPI, sin reloj real
├── repositories/    Acceso a datos
├── services/        Casos de uso que combinan dominio y repositorios
├── db/              Motor, sesión y modelos SQLAlchemy
└── api/             Routers y esquemas Pydantic
```

La regla más importante es que **`domain/` no importa nada de la aplicación**: recibe listas y
dataclasses simples más una fecha de referencia explícita. Por eso sus pruebas corren sin
PostgreSQL y sin fixtures.

## Comandos

Todos se ejecutan contra el contenedor levantado con `docker compose up -d`:

```bash
docker compose exec api pytest                          # pruebas
docker compose exec api pytest --cov=ola                # con cobertura
docker compose exec api pytest -m "not slow"            # omite el dataset completo
docker compose exec api ruff check .                    # linter
docker compose exec api ruff format .                   # formateo
docker compose exec api mypy src                        # tipos
docker compose exec api alembic upgrade head            # migraciones
docker compose exec api alembic revision --autogenerate -m "mensaje"
```

## Dependencias

Se gestionan con [uv](https://docs.astral.sh/uv/). El archivo `uv.lock` fija las versiones y
**debe versionarse**. Para añadir una dependencia, edita `pyproject.toml` y regenera el lock:

```bash
docker compose exec api uv lock
docker compose build api
```

## Fecha de referencia

El estado térmico vigente **no se calcula contra el reloj del servidor** sino contra la fecha
del dato más reciente en la base. El dataset de IMARPE se publica con retraso, y usar el reloj
real dejaría todas las zonas marcadas como sin datos recientes. El reloj del sistema solo sella
eventos de auditoría: importaciones, detección de alertas y envíos de correo.
