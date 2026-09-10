# OLA: Observatorio Litoral de Anomalías térmicas

Proyecto académico del curso **Calidad de Software**. OLA es una aplicación web que transforma el dataset público de anomalía de la temperatura superficial del mar (ATSM), publicado por IMARPE/PRODUCE, en información sencilla para consultar el estado térmico de los laboratorios costeros del litoral peruano.

> Sistema completo y verificado: 688 pruebas automatizadas, 95% de cobertura en el backend y
> el stack de producción probado de extremo a extremo. Ver
> [la matriz de trazabilidad](docs/trazabilidad.md) para la evidencia por requisito.

## Objetivo

Facilitar el acceso a información térmica costera mediante:

- clasificación de cada zona como **cálida**, **neutra** o **fría**;
- detección de tendencias térmicas sostenidas;
- visualización en un mapa interactivo;
- consulta de históricos y comparación entre laboratorios;
- alertas para usuarios suscritos a una o más zonas.

OLA es una herramienta complementaria. No reemplaza los boletines técnicos de IMARPE ni pretende predecir con certeza eventos El Niño o La Niña.

## Requisitos principales

| Código | Funcionalidad |
|---|---|
| RF-01 | Detectar anomalías sostenidas fuera del rango neutro de ±0.5 °C durante un número configurable de días. |
| RF-02 | Proyectar la clasificación térmica de los próximos 3 a 7 días mediante un modelo simple. |
| RF-03 | Notificar por correo y dentro de la aplicación a los usuarios suscritos. |
| RF-04 | Mostrar el estado vigente de los 10 laboratorios costeros en un mapa interactivo. |
| RF-05 | Graficar el histórico de anomalías por laboratorio y rango de fechas. |
| RF-06 | Comparar las series de dos o más laboratorios en un mismo periodo. |
| RF-07 | Permitir registro, autenticación y suscripción a zonas de interés. |
| RF-08 | Importar y actualizar el CSV de ATSM validando sus columnas. |

## Tecnologías

- **Backend:** Python 3.13 con FastAPI, SQLAlchemy y Alembic.
- **Base de datos:** PostgreSQL 17.
- **Frontend:** React con Vite y TypeScript; Leaflet para el mapa y Recharts para los gráficos.
- **Pruebas:** pytest, Vitest y Playwright.
- **Despliegue:** Docker sobre un VPS Linux administrado con Dokploy.
- **Comunicación:** API REST propia mediante HTTPS.
- **Fuente de datos:** dataset abierto de IMARPE/PRODUCE.

## Estructura del repositorio

```text
.
├── backend/                         # API FastAPI, lógica de negocio e importador
│   ├── src/ola/                     # Código fuente
│   ├── alembic/                     # Migraciones de base de datos
│   └── tests/                       # Pruebas unitarias y de integración
├── frontend/                        # Interfaz web (React + Vite + TypeScript)
│   ├── src/                         # Código fuente
│   └── e2e/                         # Pruebas de extremo a extremo (Playwright)
├── dataset/
│   └── IMARPE_Anomalia_TSM.csv      # Dataset base para desarrollo
├── docs/
│   ├── requisitos.md                # Especificación de Requisitos de Software
│   ├── trazabilidad.md              # Matriz de trazabilidad y evidencia de pruebas
│   ├── decisiones.md                # Registro de decisiones de diseño
│   └── presentacion-ola.html        # Presentación del proyecto
├── compose.yml                      # Entorno de desarrollo
├── compose.prod.yml                 # Despliegue en el VPS con Dokploy
├── .env.example                     # Plantilla de configuración
└── README.md
```

## Dataset

El archivo de desarrollo contiene una fila por medición y utiliza las siguientes columnas:

| Columna | Descripción |
|---|---|
| `FECHA_MEDICION` | Fecha de la medición. |
| `LABORATORIO_COSTERO` | Laboratorio o zona costera donde se registra el dato. |
| `ANOMALIA_TEMPERATURA` | Anomalía térmica expresada en grados Celsius. |

La clasificación base prevista es:

- **Cálida:** anomalía mayor que `+0.5 °C`.
- **Neutra:** anomalía entre `-0.5 °C` y `+0.5 °C`.
- **Fría:** anomalía menor que `-0.5 °C`.

El número de días consecutivos para considerar una tendencia sostenida tendrá un valor por defecto de 5 y podrá configurarse desde la aplicación.

## Estado del proyecto

- [x] Definición del problema y alcance.
- [x] Catálogo inicial de requisitos funcionales y no funcionales.
- [x] Incorporación del dataset de desarrollo.
- [x] Prototipo de presentación del proyecto.
- [x] Andamiaje del monorepo, contenedores y arranque con Docker Compose.
- [x] Registro, autenticación con JWT y control de acceso por rol.
- [x] Importación del CSV, validación de su formato y catálogo de las 10 zonas.
- [x] Clasificación térmica y detección de tendencias sostenidas.
- [x] Mapa interactivo de las 10 zonas.
- [x] Gráficos históricos y comparación entre laboratorios.
- [x] Proyección de tendencia a corto plazo.
- [x] Suscripciones y notificaciones por correo.
- [x] Despliegue en VPS con Dokploy.

## Documentación

- [Especificación de Requisitos de Software](docs/requisitos.md)
- [Matriz de trazabilidad y evidencia de pruebas](docs/trazabilidad.md)
- [Registro de decisiones de diseño](docs/decisiones.md)
- [Presentación del proyecto OLA](docs/presentacion-ola.html)

## Desarrollo local

Requisitos previos: **Docker** y **Docker Compose**. No hace falta instalar Python ni Node en
el equipo: todo corre dentro de contenedores.

```bash
cp .env.example .env      # 1. configura el entorno
```

Edita `.env` y cambia al menos `POSTGRES_PASSWORD`, `OLA_JWT_SECRET` y `OLA_ADMIN_PASSWORD`.
Puedes generar secretos con `openssl rand -hex 32`. Si algún puerto choca con un servicio que
ya tengas corriendo (es frecuente con PostgreSQL en el 5432), cámbialo en el mismo archivo.

```bash
docker compose up -d --build                  # 2. levanta db, api, web y mailpit
docker compose exec api alembic upgrade head  # 3. aplica las migraciones
```

| Servicio | URL por defecto |
|---|---|
| Aplicación web | http://localhost:5173 |
| API | http://localhost:8000/api |
| Documentación de la API | http://localhost:8000/api/docs |
| Bandeja de correo (Mailpit) | http://localhost:8025 |

La base de datos arranca **vacía**. Para cargar datos, inicia sesión con el administrador
definido en `.env` e importa `dataset/IMARPE_Anomalia_TSM.csv` desde la aplicación (RF-08).

### Pruebas

```bash
docker compose exec api pytest --cov=ola      # unitarias e integración del backend
docker compose exec web pnpm test             # unitarias del frontend
docker compose --profile e2e run --rm e2e     # extremo a extremo con Playwright
```

No se deben incluir credenciales reales en el repositorio: `.env` está en `.gitignore` y solo
se versiona `.env.example`.

## Despliegue en un VPS con Dokploy

El sistema se despliega con [`compose.prod.yml`](compose.prod.yml), que se diferencia del
entorno de desarrollo en que no monta el código, no publica puertos (Traefik enruta por
dominio), no incluye Mailpit y construye las imágenes en su etapa de producción.

### 1. Preparar los dominios

Se usan dos subdominios apuntando al VPS:

| Dominio | Servicio |
|---|---|
| `ola.tudominio.pe` | Aplicación web |
| `api.ola.tudominio.pe` | API |

### 2. Crear el servicio en Dokploy

Crea un proyecto de tipo **Compose**, apunta al repositorio y a `compose.prod.yml`, y define
las variables en su interfaz. **No subas un archivo `.env` al servidor:** los secretos se
cargan desde Dokploy. Las variables necesarias están listadas en
[`.env.example`](.env.example), sección de producción.

Genera los secretos antes de empezar:

```bash
openssl rand -hex 32   # OLA_JWT_SECRET
openssl rand -hex 16   # POSTGRES_PASSWORD
openssl rand -hex 12   # OLA_ADMIN_PASSWORD
```

> En producción la aplicación **se niega a arrancar** si `OLA_JWT_SECRET` tiene menos de 32
> bytes o conserva el valor de la plantilla. Es deliberado: un secreto débil permitiría a
> cualquiera emitir tokens de administrador.

### 3. Dos detalles que suelen causar problemas

- **`OLA_API_URL` se aplica al construir, no al arrancar.** Vite escribe las variables `VITE_*`
  dentro del JavaScript compilado. Si cambias el dominio de la API hay que **reconstruir** la
  imagen del frontend; reiniciar el contenedor no basta.
- **`OLA_WEB_ORIGIN` debe coincidir exactamente** con el dominio de la web, con su esquema y
  sin barra final. Como la API vive en otro subdominio, sin este origen permitido el navegador
  bloquea todas las llamadas.

### 4. Desplegar y verificar

Al arrancar, el contenedor de la API aplica las migraciones automáticamente, protegidas con un
bloqueo de PostgreSQL para que dos réplicas no lo hagan a la vez, y crea la cuenta de
administrador definida en las variables.

```bash
curl https://api.ola.tudominio.pe/api/health/ready    # {"status":"ok","database":"ok"}
curl https://api.ola.tudominio.pe/api/laboratories    # las 10 zonas
```

### 5. Cargar el dataset

La base arranca **vacía**, con el catálogo de zonas pero sin mediciones. Inicia sesión en
`https://ola.tudominio.pe` con la cuenta de administrador e importa
`dataset/IMARPE_Anomalia_TSM.csv` desde la pantalla de administración. Después pulsa
**Reevaluar alertas**.

Esa importación sirve además de verificación del despliegue: si funciona, el sistema entero
funciona. Medición de referencia: 125,701 filas en unos 12 segundos.

### 6. Copias de seguridad

Dokploy incluye respaldos programados para bases de datos. En el servicio `db`, sección
**Backups**, configura un destino S3 y una expresión de cron (por ejemplo `0 3 * * *` para un
respaldo diario a las 3 de la madrugada).

> Esta parte no pudo verificarse: depende de la instalación de Dokploy y de un destino de
> almacenamiento. Conviene comprobar que el primer respaldo se generó y **probar una
> restauración** antes de confiar en ella.

Respaldo y restauración manuales, como respaldo de lo anterior:

```bash
docker compose -f compose.prod.yml exec db \
  pg_dump -U ola -d ola --format=custom > ola-$(date +%F).dump

docker compose -f compose.prod.yml exec -T db \
  pg_restore -U ola -d ola --clean --if-exists < ola-2026-09-10.dump
```

El dataset siempre se puede reimportar, pero los usuarios, las suscripciones y el historial de
alertas solo viven en la base.

## Calidad de software

El proyecto se desarrolló aplicando prácticas de calidad durante todo el ciclo de vida.

| Evidencia | Estado |
|---|---|
| Pruebas automatizadas | **688** en tres capas |
| Cobertura del backend | **95%** de las sentencias |
| Análisis estático | ruff y mypy en modo estricto, sin observaciones |
| Trazabilidad | cada RF conectado con su código y sus pruebas en [docs/trazabilidad.md](docs/trazabilidad.md) |
| Control de cambios | toda desviación de la SRS registrada con fecha y motivo en su sección 5 |

```bash
docker compose exec api pytest --cov=ola     # backend
docker compose exec api ruff check .         # linter
docker compose exec api mypy src             # tipos
docker compose exec web pnpm test            # frontend
docker compose exec web pnpm typecheck       # tipos del frontend
docker compose --profile e2e run --rm e2e    # extremo a extremo
```

Otras prácticas aplicadas:

- validación del formato y del contenido del dataset, con importación parcial y reporte de
  errores por fila;
- contraseñas con bcrypt y negativa a arrancar en producción con secretos débiles;
- código versionado con commits descriptivos;
- documentación actualizada junto con cada avance.

## Equipo

- **Product Owner:** Miguel Angel Flores Leon
- **Scrum Master:** Jorge Ortiz Castañeda
- **Development Team:** Frederick Mares Graos, Jhordan Huamani Huamani y Piero Adrian Delgado Chipana

## Fuente y atribución

Los datos utilizados provienen del dataset abierto **Anomalía de la Temperatura Superficial del Mar (ATSM) de los laboratorios costeros del IMARPE**, publicado a través de la plataforma de datos abiertos del Estado peruano. El sistema deberá mostrar esta atribución de forma visible y respetar la licencia aplicable.

## Licencia

Proyecto académico. La licencia del código y las condiciones de redistribución del dataset deberán definirse antes de una publicación externa.
