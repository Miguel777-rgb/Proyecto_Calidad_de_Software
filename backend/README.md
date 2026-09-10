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

## Autenticación (RF-07)

- Contraseñas con **bcrypt**; nunca se almacenan ni se devuelven en claro.
- Sesión mediante **JWT** en la cabecera `Authorization: Bearer <token>`, con 60 minutos de
  vigencia configurables en `OLA_ACCESS_TOKEN_MINUTES`.
- Política de contraseñas: mínimo 8 caracteres y sin reglas de composición, siguiendo la
  recomendación del NIST. Exigir mayúsculas y símbolos empuja a claves predecibles y perjudica
  al perfil de usuario del sistema.
- El registro público **siempre** crea usuarios con rol `user`. El rol `admin` solo existe
  mediante el arranque desde `OLA_ADMIN_EMAIL` / `OLA_ADMIN_PASSWORD`.
- El correo se normaliza a minúsculas, así que `Juan@Ejemplo.pe` y `juan@ejemplo.pe` son la
  misma cuenta.
- En `OLA_ENV=production` la aplicación **se niega a arrancar** si `OLA_JWT_SECRET` tiene menos
  de 32 bytes o si conserva el valor de la plantilla.

## Base de datos de pruebas

Las pruebas de integración usan una base aparte llamada `ola_test`, que se crea sola en la
primera ejecución. Nunca escriben en la base de desarrollo, así que los datos importados
sobreviven a `pytest`.
