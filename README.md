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
├── backend/                         # API, lógica de negocio e importador
├── dataset/
│   └── IMARPE_Anomalia_TSM.csv      # Dataset base para desarrollo
├── docs/
│   ├── presentacion-ola.html        # Presentación del proyecto
│   └── requisitos.md                # Especificación de Requisitos de Software
├── frontend/                        # Interfaz web responsiva
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
- [ ] Implementación del importador y validación del CSV.
- [ ] Desarrollo de la API FastAPI.
- [ ] Desarrollo del mapa, gráficos y comparación de series.
- [ ] Registro, autenticación y suscripciones.
- [ ] Detección de tendencias, proyecciones y notificaciones.
- [ ] Pruebas unitarias, de integración y validación del prototipo.
- [ ] Contenedorización y despliegue.

## Documentación

- [Especificación de Requisitos de Software](docs/requisitos.md)
- [Presentación del proyecto OLA](docs/presentacion-ola.html)

## Desarrollo local

La implementación aún no cuenta con un entorno ejecutable completo. Cuando se incorporen los servicios, esta sección documentará los comandos para:

1. configurar las variables de entorno;
2. iniciar PostgreSQL y la API mediante Docker;
3. ejecutar el frontend;
4. importar el CSV de prueba;
5. ejecutar las pruebas automatizadas.

No se deben incluir credenciales reales en el repositorio. Las variables de configuración deberán documentarse en un archivo `.env.example` sin secretos.

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