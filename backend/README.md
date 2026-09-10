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

## Importación del dataset (RF-08)

La importación es **manual**: la ejecuta un administrador desde la aplicación. No hay tarea
programada; la SRS se actualizó en consecuencia (sección 5, versión 1.2).

- El archivo se lee como `utf-8-sig`, porque IMARPE lo publica con marca de orden de bytes.
- La carga es **parcial**: las filas válidas entran y las inválidas se rechazan indicando línea
  y motivo. Descartar 125,000 filas correctas por unas pocas erróneas dejaría el sistema vacío.
- Los laboratorios **nunca** se crean al importar. El catálogo lo carga una migración; una
  errata en el archivo generaría una zona fantasma y el mapa dejaría de tener las 10 del RF-04.
- Reimportar el archivo **actualiza** los valores que IMARPE haya corregido, sin duplicar
  mediciones. El resumen distingue filas nuevas, corregidas y sin cambios.
- Una fila con un decimal escrito con coma (`1,5`) se rechaza: al partirse en dos columnas
  entraría con el valor `1` y corrompería el dato en silencio.

Medición real con el dataset completo: **125,701 filas en unos 11 segundos**, muy por debajo
del límite de 2 minutos que fija la SRS.

## Datos de prueba

`tests/fixtures/sample_atsm.csv` es un dataset reducido de 392 filas con casos de racha
construidos a propósito (rachas al límite, huecos que rompen o no la racha, zonas sin datos
recientes). Se regenera con `python tests/fixtures/generar_muestra.py`, cuyo encabezado
documenta cada caso.

## Clasificación y rachas (RF-01)

- **Clasificación:** anomalía mayor que `+0.5 °C` es cálida, menor que `-0.5 °C` es fría, y el
  resto neutra. El umbral es **exclusivo**: exactamente `±0.5` cuenta como neutro, siguiendo el
  criterio de ENFEN.
- **Racha:** se cuentan **registros consecutivos**, no días de calendario. Entre dos mediciones
  se toleran hasta 2 días faltantes; a partir del tercero la racha se reinicia. Se exigen 5
  registros. Los tres valores son configurables.
- **Fecha de referencia:** `MAX(measured_on)` sobre toda la tabla, **nunca** el reloj del
  servidor. IMARPE publica con retraso, y usar la hora real dejaría las 10 zonas marcadas como
  obsoletas. Los endpoints de lectura aceptan `?as_of=` para fijarla.
- **Color del mapa:** promedio de los últimos 5 días, no la última medición, para que un solo
  día atípico no haga parpadear la zona.
- **Vigencia:** una zona sin mediciones en los últimos 7 días se marca «sin datos recientes»,
  no se clasifica y no alerta. Así MATARANI, cuya serie termina en 2016, queda marcada sin
  nombrarla en el código.
- **Evaluación:** recorre todo el histórico y es **idempotente**. Usa upsert sobre
  `(laboratorio, estado, fecha de inicio)`, de modo que el identificador del episodio se
  mantiene entre evaluaciones; de eso dependerá RF-03 para no reenviar la misma alerta.
- Cada episodio guarda los parámetros con los que se detectó. Cambiar los umbrales **no**
  recalcula nada: el administrador decide cuándo reevaluar.

Medición real sobre el dataset completo: **4,164 episodios desde 1970 en unos 3 segundos**, de
los cuales 8 siguen vigentes.
