# OLA: Observatorio Litoral de Anomalías térmicas

Proyecto académico del curso **Calidad de Software**. OLA es una aplicación web que transforma el dataset público de anomalía de la temperatura superficial del mar (ATSM), publicado por IMARPE/PRODUCE, en información sencilla para consultar el estado térmico de los laboratorios costeros del litoral peruano.

> Web completa y verificada: 1,073 pruebas automatizadas, 95 % de cobertura en el backend,
> accesibilidad WCAG 2.2 AA comprobada en cada pantalla y el stack probado de extremo a extremo
> en escritorio y celular. La aplicación Android (RF-09) está en construcción por fases; su
> marco ya funciona en un celular real. Ver
> [la matriz de trazabilidad](docs/trazabilidad.md) para la evidencia por requisito y
> [el plan de calidad](docs/calidad.md) para las metas y las métricas.

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
| RF-09 | Ofrecer una aplicación para Android 10 o superior con las funciones del usuario final y avisos push. |

## Tecnologías

- **Backend:** Python 3.13 con FastAPI, SQLAlchemy y Alembic.
- **Base de datos:** PostgreSQL 17.
- **Frontend:** React con Vite y TypeScript; Tailwind CSS; Leaflet para el mapa y Recharts para los gráficos; fuentes autoalojadas (Inter, Space Grotesk, JetBrains Mono) e iconos lucide.
- **Aplicación móvil:** Expo (React Native) con TypeScript, para Android 10 o superior (en construcción).
- **Código compartido:** `@ola/compartido`, con los tipos y el cliente de la API, la lógica de presentación y los textos que usan la web y la app.
- **Pruebas:** pytest, Vitest y Playwright, con axe para accesibilidad y capturas para regresión visual.
- **Calidad:** Uptime Kuma para medir la disponibilidad del backend.
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
├── mobile/                          # App Android (Expo + React Native + TypeScript)
│   ├── src/app/                     # Pantallas (rutas de expo-router)
│   ├── .maestro/                    # Pruebas de extremo a extremo (Maestro)
│   └── scripts/                     # Compilar, probar en el celular y medir el arranque
├── packages/
│   └── compartido/                  # Tipos y cliente de la API, lógica y textos (web y app)
├── tools/
│   └── uptime-kuma/                 # Configuración e informe de disponibilidad
├── dataset/
│   └── IMARPE_Anomalia_TSM.csv      # Dataset base para desarrollo
├── docs/
│   ├── requisitos.md                # Especificación de Requisitos de Software
│   ├── calidad.md                   # Plan de aseguramiento de la calidad (SQA)
│   ├── defectos.md                  # Bitácora de defectos
│   ├── trazabilidad.md              # Matriz de trazabilidad y evidencia de pruebas
│   ├── arquitectura.md              # Modelo del sistema (C4)
│   ├── decisiones.md                # Registro de decisiones de diseño
│   ├── diseno.md                    # Guía de diseño de la interfaz
│   └── presentacion-ola.html        # Presentación del proyecto
├── compose.yml                      # Entorno de desarrollo y pruebas
├── compose.prod.yml                 # Despliegue en el VPS con Dokploy
├── package.json                     # Workspace de pnpm (web, paquete compartido y app)
├── pnpm-workspace.yaml
├── pnpm-lock.yaml                   # Un solo lockfile para todo el JavaScript
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
- [x] Plan de aseguramiento de la calidad con metas, métricas, riesgos y bitácora de defectos.
- [ ] Aplicación móvil Android (RF-09), en construcción por fases.

## Documentación

- [Especificación de Requisitos de Software](docs/requisitos.md)
- [Plan de aseguramiento de la calidad](docs/calidad.md)
- [Bitácora de defectos](docs/defectos.md)
- [Matriz de trazabilidad y evidencia de pruebas](docs/trazabilidad.md)
- [Modelo del sistema](docs/arquitectura.md)
- [Registro de decisiones de diseño](docs/decisiones.md)
- [Guía de diseño de la interfaz](docs/diseno.md)
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
docker compose up -d --build                  # 2. levanta db, api, web, mailpit y uptime-kuma
docker compose exec api alembic upgrade head  # 3. aplica las migraciones
docker compose --profile calidad run --rm calidad configurar.py   # 4. prepara el monitor de disponibilidad
```

| Servicio | URL por defecto |
|---|---|
| Aplicación web | http://localhost:5173 |
| API | http://localhost:8000/api |
| Documentación de la API | http://localhost:8000/api/docs |
| Bandeja de correo (Mailpit) | http://localhost:8025 |
| Disponibilidad (Uptime Kuma) | http://localhost:3001 |

La base de datos arranca **vacía**. Para cargar datos, inicia sesión con el administrador
definido en `.env` e importa `dataset/IMARPE_Anomalia_TSM.csv` desde la aplicación (RF-08).

### Pruebas

```bash
docker compose exec api pytest --cov=ola                          # backend: unitarias e integración
docker compose exec -w /repo/packages/compartido web pnpm test    # paquete compartido
docker compose exec web pnpm test                                 # web: unitarias
docker compose --profile e2e run --rm e2e                         # web: escritorio, celular, axe y capturas
docker compose --profile calidad run --rm calidad -m pytest       # herramientas de calidad
```

Para medir la cobertura, usa `pnpm test:cobertura` en lugar de `pnpm test`. En Git Bash para
Windows, antepón `MSYS_NO_PATHCONV=1` a los comandos con `-w`: si no, la ruta se convierte a una
de Windows y el contenedor no la encuentra.

La medición de rendimiento compila la build de producción y comprueba que el mapa carga en
menos de 3 s con 4G normal (SRS, sección 3.3). Va aparte porque tarda más:

```bash
docker compose --profile e2e run --rm e2e sh -c "corepack enable && corepack prepare pnpm@9.15.2 --activate && pnpm install --frozen-lockfile --filter ola-frontend... && pnpm test:rendimiento"
```

Las capturas de regresión visual se generan y comparan **dentro del contenedor de Playwright**.
Si un cambio visual es intencionado, se regeneran con `pnpm exec playwright test visual.spec.ts
--update-snapshots` en ese mismo contenedor y se revisan antes de confirmarlas. Ver
[la guía de diseño](docs/diseno.md), sección 11.

> **Docker en Windows o macOS:** los contenedores no reciben avisos de cambios en los archivos.
> Vite usa sondeo (`VITE_WATCH_POLLING` en `compose.yml`); el backend no, así que tras cambiar su
> código hay que ejecutar `docker compose restart api`. Cambiar `.env` también reinicia la API
> en el siguiente `docker compose up` o `run`: no lo edites mientras corren pruebas.

La web y la app comparten `packages/compartido`, así que los contenedores `web` y `e2e` montan el
repositorio entero y la imagen web se construye desde la raíz. Instalan solo la web y lo que
necesita (`--filter ola-frontend...`); sus `node_modules` viven en volúmenes de Docker.

No se deben incluir credenciales reales en el repositorio: `.env` está en `.gitignore` y solo
se versiona `.env.example`.

## App Android

La app (`mobile/`) se compila y se prueba en el equipo, no en Docker: necesita el Android SDK y
un celular. Hoy muestra el marco completo y la fecha del dato. Sus pantallas se completan fase a
fase (ver [el plan de calidad](docs/calidad.md), sección 13).

**Requisitos:** Node 24, pnpm (Corepack usa la versión 9.15.2 del repositorio), Android SDK con
`ANDROID_HOME` definida, JDK 17 en `JAVA_HOME`, [Maestro](https://maestro.mobile.dev) y un
celular con Android 10 o superior, la depuración USB activada y autorizada para este equipo.
Del SDK hacen falta el NDK 27.1 y CMake 3.31.6; en Windows, además, las rutas largas activadas
(`LongPathsEnabled`):

```bash
android sdk install ndk/27.1.12297006 cmake/3.31.6   # el CLI nuevo del SDK; sdkmanager ya no instala
```

```bash
cd mobile
pnpm install --filter ola-mobile...   # dependencias de la app y del paquete compartido
pnpm test                             # pruebas unitarias (Jest)
pnpm lint && pnpm typecheck
```

Con el backend levantado (`docker compose up -d`) y el celular conectado:

```bash
adb reverse tcp:18000 tcp:8000  # el celular ve la API del equipo en su localhost:18000, por el cable
pnpm android                    # build de desarrollo con recarga en caliente (paquete pe.ola.app.dev)
pnpm e2e                        # compila el APK de pruebas, lo instala y corre Maestro
pnpm medir                      # tiempo hasta ver el estado del mar, mediana de 3 arranques
pnpm compilar demo              # APK contra el VPS, en mobile/informes/ola-demo.apk
```

`pnpm e2e` prepara el celular entre flujos: corta el acceso a la API para probar el error de
conexión y sube la letra al 200 %. Al terminar deja la letra y las animaciones como estaban. Los
informes y capturas quedan en `mobile/informes/`, que no se versiona.

> **pnpm en Windows** enlaza `node_modules` con uniones de directorio que apuntan a rutas de
> Windows. Un contenedor Linux no puede seguirlas, así que los scripts de la app corren en el
> equipo. La primera compilación nativa tarda más de una hora: compila el C++ de React Native.
> Las siguientes reutilizan `mobile/.cxx/`, que no se versiona.

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

El proyecto se desarrolla con un plan de aseguramiento de la calidad
([docs/calidad.md](docs/calidad.md)): metas por atributo, puertas de calidad al cerrar cada
fase, métricas medidas, costo de calidad, autoevaluación CMMI e ISO/IEC 15504, riesgos y una
retrospectiva por fase.

| Evidencia | Estado |
|---|---|
| Pruebas automatizadas | **1,073** en backend, paquete compartido, web, app móvil, E2E y herramientas |
| Cobertura de sentencias | **95 %** backend · **97.5 %** paquete compartido · **89.9 %** web · **91.1 %** app |
| Defectos | 27 registrados con severidad, detección y costo en [docs/defectos.md](docs/defectos.md) |
| Disponibilidad | Uptime Kuma consulta la API del equipo y la del VPS cada minuto |
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
