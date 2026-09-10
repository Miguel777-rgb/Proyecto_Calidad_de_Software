# OLA: Observatorio Litoral de Anomalías térmicas

Proyecto académico del curso **Calidad de Software**. OLA es una aplicación web que transforma el dataset público de anomalía de la temperatura superficial del mar (ATSM), publicado por IMARPE/PRODUCE, en información sencilla para consultar el estado térmico de los laboratorios costeros del litoral peruano.

> Este repositorio se encuentra en fase de planificación y prototipado. La implementación del backend y frontend se desarrollará durante los sprints del curso.

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
| RF-03 | Notificar por correo y, cuando esté disponible, SMS a los usuarios suscritos. |
| RF-04 | Mostrar el estado vigente de los 10 laboratorios costeros en un mapa interactivo. |
| RF-05 | Graficar el histórico de anomalías por laboratorio y rango de fechas. |
| RF-06 | Comparar las series de dos o más laboratorios en un mismo periodo. |
| RF-07 | Permitir registro, autenticación y suscripción a zonas de interés. |
| RF-08 | Importar y actualizar el CSV de ATSM validando sus columnas. |

## Tecnologías previstas

- **Backend:** Python con FastAPI.
- **Base de datos:** PostgreSQL.
- **Frontend:** aplicación web responsiva.
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
│   ├── presentacion-ola.html        # Presentación del proyecto
│   └── requisitos.md                # Especificación de Requisitos de Software
├── compose.yml                      # Orquestación de todos los servicios
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
- [ ] Importación del CSV y validación de su formato.
- [ ] Clasificación térmica y detección de tendencias sostenidas.
- [ ] Mapa interactivo de las 10 zonas.
- [ ] Gráficos históricos y comparación entre laboratorios.
- [ ] Proyección de tendencia a corto plazo.
- [ ] Suscripciones y notificaciones por correo.
- [ ] Despliegue en VPS con Dokploy.

## Documentación

- [Especificación de Requisitos de Software](docs/requisitos.md)
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

## Calidad de software

El proyecto se desarrollará aplicando prácticas de calidad durante todo el ciclo de vida:

- requisitos trazables mediante la matriz incluida en la SRS;
- pruebas unitarias e integración para cada requisito implementado;
- validación del formato y contenido del dataset;
- contraseñas almacenadas con hash y comunicación exclusivamente por HTTPS;
- código versionado con commits descriptivos;
- documentación actualizada junto con cada avance relevante.

## Equipo

- **Product Owner:** Miguel Angel Flores Leon
- **Scrum Master:** Jorge Ortiz Castañeda
- **Development Team:** Frederick Mares Graos, Jhordan Huamani Huamani y Piero Adrian Delgado Chipana

## Fuente y atribución

Los datos utilizados provienen del dataset abierto **Anomalía de la Temperatura Superficial del Mar (ATSM) de los laboratorios costeros del IMARPE**, publicado a través de la plataforma de datos abiertos del Estado peruano. El sistema deberá mostrar esta atribución de forma visible y respetar la licencia aplicable.

## Licencia

Proyecto académico. La licencia del código y las condiciones de redistribución del dataset deberán definirse antes de una publicación externa.