# Especificación de Requisitos de Software (SRS)
## Proyecto OLA — Observatorio Litoral de Anomalías térmicas

**Documento elaborado conforme al estándar IEEE Std 830-1998**

| Campo | Detalle |
|---|---|
| Curso | Calidad de Software (3.8.2.21) |
| Docente | Maribel Molina Barriga |
| Periodo lectivo | 2026-II |
| Facultad | Facultad de Ingenierías y Arquitectura — Ingeniería de Software |
| Equipo | Frederick Mares Graos · Jhordan Huamani Huamani · Jorge Ortiz Castañeda · Miguel Angel Flores Leon · Piero Adrian Delgado Chipana |
| Versión | 1.4 |
| Estado | Para revisión — Hito 1 |

---

## 1. Introducción

### 1.1 Propósito
Este documento especifica los requisitos funcionales y no funcionales del sistema **OLA**, desarrollado como trabajo de creatividad práctico del curso de Calidad de Software, conservando el proceso de calidad de software durante todo su desarrollo, tal como exige el enunciado del trabajo. Está dirigido a la docente del curso, como evaluadora, y al propio equipo, como guía de implementación durante los sprints.

### 1.2 Alcance
**Nombre del producto:** OLA (Observatorio Litoral de Anomalías térmicas).

**Qué hace:** una aplicación web que toma el dataset abierto de Anomalía de la Temperatura Superficial del Mar (ATSM) publicado por IMARPE/PRODUCE, lo clasifica en estados simples (cálido/neutro/frío) por zona costera, lo visualiza en un mapa interactivo y genera alertas cuando una zona muestra una tendencia térmica sostenida.

**Qué NO hace (fuera de alcance en esta versión):**
- No predice con certeza científica eventos El Niño/La Niña (eso es función oficial de ENFEN, que usa más variables que solo temperatura).
- No reemplaza los boletines técnicos de IMARPE, los complementa.
- No incluye aplicación móvil nativa (solo web responsiva).
- No procesa pagos ni tiene modelo de monetización en esta fase.

**Beneficios esperados:** dar visibilidad accesible, en un formato simple, a un dato público que hoy solo llega a especialistas — dirigido principalmente a pescadores artesanales del litoral peruano.

### 1.3 Definiciones, acrónimos y abreviaturas
| Término | Significado |
|---|---|
| ATSM | Anomalía de la Temperatura Superficial del Mar |
| IMARPE | Instituto del Mar del Perú |
| PRODUCE | Ministerio de la Producción |
| ENFEN | Comité Multisectorial encargado del Estudio Nacional del Fenómeno El Niño |
| RF | Requisito Funcional |
| RNF | Requisito No Funcional |
| SRS | Software Requirements Specification (Especificación de Requisitos de Software) |
| PO | Product Owner |
| SM | Scrum Master |
| VPS | Virtual Private Server |
| API | Application Programming Interface |

### 1.4 Referencias
- IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications*.
- ISO/IEC 25010 (SQuaRE) — Modelo de calidad de producto de software.
- Dataset: *Anomalía de la Temperatura Superficial del Mar (ATSM) de los laboratorios costeros del IMARPE*, disponible en www.datosabiertos.gob.pe.
- Sílabo del curso Calidad de Software, periodo 2026-II, docente Maribel Molina Barriga.
- Enunciado del trabajo de creatividad del curso (objetivo, descripción del proyecto, dominio de la aplicación).

### 1.5 Visión general del documento
La sección 2 describe el producto de forma general (perspectiva, funciones, usuarios, restricciones y supuestos). La sección 3 detalla los requisitos específicos: funcionales, de interfaz, de rendimiento, de diseño y de calidad. La sección 4 incluye la matriz de trazabilidad de requisitos exigida por el enunciado del curso. La sección 5 registra el control de versiones del propio documento.

---

## 2. Descripción general

### 2.1 Perspectiva del producto
OLA es un sistema nuevo e independiente. No reemplaza ni se integra formalmente con los sistemas internos de IMARPE/ENFEN: consume su dataset público de forma periódica y opera como una capa de visualización y alerta adicional, propia del equipo.

### 2.2 Funciones del producto (resumen)
1. Clasificar automáticamente el estado térmico por zona costera (RF-01).
2. Proyectar la tendencia térmica a corto plazo (RF-02).
3. Notificar a los usuarios suscritos ante una alerta sostenida (RF-03).
4. Visualizar el estado de las 10 zonas en un mapa interactivo (RF-04).
5. Mostrar históricos y comparaciones entre zonas (RF-05, RF-06).
6. Permitir registro y suscripción de usuarios (RF-07).
7. Mantener actualizado el dataset base (RF-08).

### 2.3 Características de los usuarios
| Tipo de usuario | Perfil | Necesidad principal |
|---|---|---|
| Pescador artesanal | Usuario final, posiblemente con alfabetización digital limitada, acceso mayormente desde celular | Ver el estado de su zona y recibir alertas simples, sin necesidad de interpretar datos técnicos |
| Administrador | Miembro del equipo del proyecto | Mantener el catálogo de laboratorios, configurar umbrales y supervisar la importación del dataset |

### 2.4 Restricciones
- **Tecnológicas (decisión final del equipo):** backend en **Python** con el framework **FastAPI**; base de datos **PostgreSQL**; contenedores **Docker**; despliegue en **VPS Linux** administrado con Dokploy.
- **De tiempo:** el proyecto debe completarse dentro del cronograma del curso — Hito 1 (semana del 12 al 17 de octubre de 2026) e Hito 2 (primera semana de diciembre de 2026), coherente con las fechas de Evidencia 2 (12/10/2026) y Evidencia 4 (7/12/2026) del sílabo.
- **De equipo:** 5 integrantes, esfuerzo mínimo de 4 horas por persona por día de trabajo, según exige el enunciado.
- **De datos:** el sistema depende enteramente de la disponibilidad y el formato del dataset público de IMARPE; cualquier cambio en su estructura (columnas, frecuencia) puede requerir ajustes al importador (RF-08).

### 2.5 Supuestos y dependencias
- Se asume que IMARPE continuará publicando el dataset ATSM con la misma frecuencia diaria y estructura de columnas (`FECHA_MEDICION`, `LABORATORIO_COSTERO`, `ANOMALIA_TEMPERATURA`) durante el desarrollo del curso.
- Se asume acceso a un VPS ya disponible para el equipo (infraestructura propia, no proporcionada por la universidad).
- Se asume que el umbral de clasificación (±0.5 °C, criterio usado por ENFEN) es aceptable como base para este trabajo académico; de no serlo, queda pendiente de validación con la docente.
- El catálogo de requisitos funcionales de este documento fue presentado al equipo y se mantiene sin observaciones al momento de esta versión.

---

## 3. Requisitos específicos

### 3.1 Requisitos funcionales

> Complejidad: 3 Alta · 3 Media · 2 Baja (máximo 8, según exige el enunciado del curso).

#### RF-01 — Detección de anomalía térmica sostenida
| Campo | Detalle |
|---|---|
| Descripción | El sistema **deberá** analizar la serie temporal de anomalías por laboratorio costero y detectar cuando el valor se mantenga fuera del rango neutro (±0.5 °C) durante un número configurable de días consecutivos (por defecto 5), generando un evento de "tendencia sostenida". |
| Entradas | Serie histórica de `ANOMALIA_TEMPERATURA` por `LABORATORIO_COSTERO` y `FECHA_MEDICION`. |
| Proceso | Conteo de **registros consecutivos** fuera de umbral. Entre dos mediciones seguidas se toleran hasta 2 días faltantes (configurable); a partir del tercero la racha se reinicia. El umbral (±0.5 °C) es exclusivo: exactamente ±0.5 se considera neutro. |
| Salidas | Evento de tendencia sostenida (zona, fecha de inicio, clasificación). |
| Complejidad | Alta |

#### RF-02 — Proyección de tendencia a corto plazo
| Campo | Detalle |
|---|---|
| Descripción | El sistema **deberá** estimar, a partir de la serie histórica reciente de cada laboratorio, la clasificación térmica esperada para los próximos 3 a 7 días, mediante un modelo simple (regresión lineal o media móvil ponderada). |
| Entradas | Serie histórica reciente por laboratorio. |
| Proceso | Modelo de regresión lineal simple o media móvil ponderada. |
| Salidas | Proyección de clasificación con horizonte de N días, marcada explícitamente como estimación aproximada. |
| Complejidad | Alta |

#### RF-03 — Notificación automática
| Campo | Detalle |
|---|---|
| Descripción | El sistema **deberá** enviar una notificación (correo electrónico y, cuando esté disponible, SMS) a los usuarios suscritos a una zona cuando dicha zona entre en estado de alerta (evento del RF-01). |
| Entradas | Evento de tendencia sostenida (RF-01), lista de usuarios suscritos por zona. |
| Proceso | Envío vía SMTP (correo) y pasarela de terceros (SMS). |
| Salidas | Notificación entregada + registro de envío. |
| Complejidad | Alta |

#### RF-04 — Mapa interactivo de estado por zona
| Campo | Detalle |
|---|---|
| Descripción | El sistema **deberá** mostrar un mapa con los 10 laboratorios costeros, coloreando cada uno según su clasificación vigente (cálido/neutro/frío). |
| Entradas | Promedio de la anomalía de los últimos 5 días por laboratorio (ventana configurable), medido contra la fecha del dato más reciente del sistema y no contra el reloj del servidor. Una zona sin mediciones en los últimos 7 días se muestra como «sin datos recientes» y no se clasifica. |
| Salidas | Vista de mapa interactivo. |
| Complejidad | Media |

#### RF-05 — Gráficos históricos por laboratorio
| Campo | Detalle |
|---|---|
| Descripción | El sistema **deberá** generar gráficos de línea de la anomalía térmica por laboratorio, con filtro de rango de fechas seleccionable por el usuario. El rango inicial es de 90 días. Al ampliarlo, los valores se agrupan automáticamente (diario hasta un año, promedio semanal hasta cinco, mensual más allá) para no superar el límite de rendimiento. La línea se interrumpe en los periodos sin medición en lugar de interpolarlos. |
| Complejidad | Media |

#### RF-06 — Comparación entre laboratorios costeros
| Campo | Detalle |
|---|---|
| Descripción | El sistema **deberá** permitir seleccionar entre dos y cuatro laboratorios costeros y mostrar sus series de anomalía superpuestas para un mismo periodo. Cada serie se distingue por color, forma de marcador y patrón de trazo, de modo que la identidad no dependa únicamente del color. |
| Complejidad | Media |

#### RF-07 — Registro y autenticación de usuarios
| Campo | Detalle |
|---|---|
| Descripción | El sistema **deberá** permitir que un usuario se registre con correo y contraseña, inicie sesión y seleccione una o más zonas de interés para recibir alertas. |
| Complejidad | Baja |

#### RF-08 — Importación y actualización del dataset ATSM
| Campo | Detalle |
|---|---|
| Descripción | El sistema **deberá** permitir que un administrador cargue manualmente el CSV publicado por IMARPE desde la aplicación, validando el formato de las 3 columnas del dataset. La importación es parcial y tolerante: las filas válidas se registran y las inválidas se rechazan con su motivo. Reimportar el archivo actualiza los valores corregidos por IMARPE sin duplicar mediciones. |
| Complejidad | Baja |

### 3.2 Requisitos de interfaces externas

**3.2.1 Interfaces de usuario:** interfaz web responsiva, accesible desde navegador de escritorio o móvil, sin necesidad de instalación. Prioriza simplicidad visual sobre densidad de información (ver 2.3 — perfil del pescador artesanal).

**3.2.2 Interfaces de hardware:** ninguna específica; el sistema no interactúa con sensores propios, solo consume el dataset ya procesado por IMARPE.

**3.2.3 Interfaces de software:**
- API REST propia (FastAPI) como capa de comunicación entre frontend y base de datos.
- Consumo del archivo CSV público de datosabiertos.gob.pe (IMARPE/ATSM) como fuente de datos externa.
- Servicio SMTP externo para envío de correos (RF-03).
- Pasarela de SMS de terceros (a definir por el equipo) para envío de mensajes de texto (RF-03).

**3.2.4 Interfaces de comunicación:** HTTPS para todo el tráfico entre cliente y servidor.

### 3.3 Requisitos de rendimiento
- El mapa interactivo (RF-04) deberá cargar en no más de 3 segundos bajo condiciones normales de red.
- La importación del dataset (RF-08) no deberá tardar más de 2 minutos para un archivo de hasta 1 año de histórico (~3,650 filas).
- El sistema deberá soportar, de forma referencial para efectos del curso, al menos 50 usuarios concurrentes sin degradación perceptible.

### 3.4 Restricciones de diseño
- Backend: Python + FastAPI.
- Base de datos: PostgreSQL.
- Contenedores: Docker, orquestados con Dokploy sobre un VPS Linux.
- Frontend: aplicación web responsiva (sin framework fijado aún por el equipo a la fecha de este documento).
- El sistema debe mostrar siempre la fecha de la última actualización del dato (transparencia ante posibles retrasos de IMARPE).

### 3.5 Atributos de calidad del sistema (ISO/IEC 25010 — SQuaRE)
| Característica | Cómo se aplica en OLA |
|---|---|
| Usabilidad | Interfaz comprensible sin capacitación previa para el perfil "pescador artesanal". |
| Confiabilidad | El sistema indica explícitamente cuándo el dato mostrado no corresponde al día actual. |
| Disponibilidad | Objetivo referencial de 95% de tiempo activo durante el periodo de evaluación del curso (no se exige SLA productivo). |
| Seguridad | Contraseñas almacenadas con hash (nunca en texto plano); conexión exclusivamente HTTPS. |
| Mantenibilidad | Código versionado en Git, con historial de commits legible y README actualizado. |
| Portabilidad | Contenedorización vía Docker, para facilitar el despliegue en cualquier VPS compatible. |

### 3.6 Otros requisitos
- El sistema deberá atribuir la fuente de datos (IMARPE/PRODUCE) de forma visible en la interfaz.
- El uso del dataset deberá respetar la licencia de datos abiertos del Estado peruano (uso permitido con atribución).

---

## 4. Matriz de trazabilidad de requisitos

> Distribución de responsables sugerida por el equipo para el reparto de tareas; puede ajustarse en el Sprint Planning correspondiente. Roles Scrum: **PO — Miguel Angel Flores Leon** · **SM — Jorge Ortiz Castañeda** · **Dev Team — Frederick Mares Graos, Jhordan Huamani Huamani, Piero Adrian Delgado Chipana**.

| RF | Descripción breve | Sprint de implementación | Responsable sugerido |
|---|---|---|---|
| RF-08 | Importación del dataset ATSM | Sprint 2 (15–28 sep) | Frederick Mares Graos (Dev) |
| RF-07 | Registro y autenticación | Sprint 4 (13–26 oct) | Jhordan Huamani Huamani (Dev) |
| RF-01 | Detección de anomalía sostenida | Sprint 4 (13–26 oct) | Jhordan Huamani Huamani (Dev) |
| RF-02 | Proyección de tendencia | Sprint 4–5 (13 oct–09 nov) | Piero Adrian Delgado Chipana (Dev) |
| RF-04 | Mapa interactivo | Sprint 5 (27 oct–09 nov) | Frederick Mares Graos (Dev) |
| RF-05 | Gráficos históricos | Sprint 5 (27 oct–09 nov) | Frederick Mares Graos (Dev) |
| RF-06 | Comparación entre laboratorios | Sprint 5 (27 oct–09 nov) | Jhordan Huamani Huamani (Dev) |
| RF-03 | Notificaciones automáticas | Sprint 5 (27 oct–09 nov) | Piero Adrian Delgado Chipana (Dev) + Jorge Ortiz Castañeda (SM, QA) |

**Hitos de control:**
- **Hito 1** (semana del 12 al 17 de octubre de 2026 · cierre de Sprint 3): tema, cronograma, catálogo de requisitos (este documento) y avance del producto.
- **Hito 2** (primera semana de diciembre de 2026 · cierre de Sprint 7): artículo IEEE, prototipo funcional, presentación y repositorio GitHub con README.

Todos los requisitos pasan por revisión de pruebas (unitarias e integración) durante el Sprint 6 (10–23 nov), bajo supervisión del Scrum Master.

---

## 5. Control de versiones del documento

> Sección creada para dar cumplimiento al cierre de la versión 1.0, que exigía registrar con fecha y motivo cualquier cambio en el catálogo de requisitos. Toda modificación posterior a un RF debe añadir una fila a esta tabla en el mismo avance en que se implementa el cambio.

| Versión | Fecha | RF afectado | Cambio | Motivo | Responsable |
|---|---|---|---|---|---|
| 1.0 | 2026-09-10 | — | Versión inicial del catálogo de requisitos, presentada para el Hito 1. | Línea base del documento. | Miguel Angel Flores Leon (PO) |
| 1.1 | 2026-09-10 | — | Se incorpora esta sección de control de versiones. | El cierre de la v1.0 la exigía explícitamente y era necesaria antes de registrar cualquier cambio de alcance. | Miguel Angel Flores Leon (PO) |
| 1.2 | 2026-09-10 | RF-08 | Se elimina la importación programada. El requisito queda limitado a la carga manual por el administrador. | El sistema depende de un dataset que IMARPE publica sin una frecuencia garantizada, por lo que una tarea automática añadiría un planificador y su infraestructura sin aportar valor demostrable dentro del alcance del curso. Se precisa además el comportamiento ante filas inválidas y reimportaciones, que la versión anterior no definía. | Miguel Angel Flores Leon (PO) |
| 1.3 | 2026-09-10 | RF-01, RF-04 | Se precisa el conteo de la racha (registros consecutivos con tolerancia de 2 días faltantes) y el origen del color del mapa (promedio de 5 días medido contra la fecha del dato, con marca de «sin datos recientes» a los 7 días). | La redacción original decía «días consecutivos» sin definir qué ocurre con los huecos, y el dataset de IMARPE los tiene con frecuencia. Sin precisarlo, dos implementaciones válidas darían resultados distintos. Además, usar el reloj del servidor dejaría todas las zonas sin clasificar, porque el dato se publica con retraso. | Miguel Angel Flores Leon (PO) |
| 1.4 | 2026-09-10 | RF-05, RF-06 | Se precisa el agrupado automático de las series según el rango, el tratamiento de los periodos sin medición y el máximo de cuatro laboratorios comparables, cada uno distinguido además por forma y trazo. | Una serie de 56 años tiene hasta 16,678 puntos y el navegador no puede dibujarlos sin incumplir el límite de 3 segundos de la sección 3.3. La redacción original decía «dos o más» sin fijar un techo, y con más de cuatro líneas superpuestas el gráfico deja de leerse. Distinguir las series solo por color excluiría a las personas que no lo perciben, en contra del atributo de Usabilidad de la sección 3.5. | Miguel Angel Flores Leon (PO) |

---

*Documento sujeto a revisión conforme avance el proyecto. Cada cambio en el catálogo de requisitos se registra en la sección 5.*
