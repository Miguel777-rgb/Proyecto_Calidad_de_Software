# Matriz de trazabilidad de requisitos

## Proyecto OLA — Observatorio Litoral de Anomalías térmicas

Este documento conecta cada requisito funcional de la [SRS](requisitos.md) con el código que lo
implementa y con las pruebas que demuestran que funciona. Complementa la matriz de la sección 4
de la SRS, que reparte responsables, añadiendo la evidencia de cumplimiento.

**Fecha:** 2026-09-10 · **Versión de la SRS:** 1.6

---

## Resumen

| Suite | Pruebas | Qué cubre |
|---|---|---|
| Backend — unitarias | 209 | Lógica de dominio pura, sin base de datos |
| Backend — integración | 230 | Endpoints, persistencia y permisos |
| Frontend — Vitest | 166 | Componentes y páginas con dobles de prueba |
| Extremo a extremo — Playwright | 83 | Navegador real contra el sistema completo |
| **Total** | **688** | |

Cobertura del backend: **95%** de las sentencias.

Las suites se ejecutan con:

```bash
docker compose exec api pytest --cov=ola     # backend
docker compose exec web pnpm test            # frontend
docker compose --profile e2e run --rm e2e    # extremo a extremo
```

---

## Estado por requisito

| RF | Requisito | Estado | Desviación registrada en la SRS |
|---|---|---|---|
| RF-01 | Detección de anomalía sostenida | Implementado | v1.3 — se precisa el conteo por registros y la tolerancia de huecos |
| RF-02 | Proyección de tendencia | Implementado | v1.5 — se implementan **los dos** modelos, no uno |
| RF-03 | Notificación automática | Implementado | v1.6 — **sin SMS**; correo y aviso en la aplicación |
| RF-04 | Mapa interactivo | Implementado | v1.3 — el color sale del promedio de 5 días |
| RF-05 | Gráficos históricos | Implementado | v1.4 — agrupado automático según el rango |
| RF-06 | Comparación entre laboratorios | Implementado | v1.4 — máximo de 4 zonas, distinguidas por forma |
| RF-07 | Registro y autenticación | Implementado | — |
| RF-08 | Importación del dataset | Implementado | v1.2 — **solo manual**, sin tarea programada |

---

## RF-01 — Detección de anomalía térmica sostenida

**Implementación:** `backend/src/ola/domain/streaks.py`, `classification.py`, `freshness.py`,
`services/alert_service.py`, `api/routers/alerts.py`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_streaks.py` | 28 | Racha de exactamente 5 registros alerta y la de 4 no; un hueco de 2 días se tolera y uno de 3 la rompe; el cambio de estado y los valores neutros la interrumpen |
| `tests/unit/test_classification.py` | 21 | El umbral `±0.5` es exclusivo por ambos lados |
| `tests/unit/test_freshness.py` | 10 | Una zona descontinuada queda marcada sin nombrarla en el código |
| `tests/integration/test_alerts.py` | 21 | Cada caso de la tabla del generador de datos; evaluar dos veces no duplica episodios ni cambia sus identificadores |
| `tests/integration/test_status.py` | 18 | La fecha de referencia sale del dato, no del reloj |
| `tests/integration/test_settings.py` | 20 | Cambiar los umbrales altera qué se detecta |
| `e2e/estado.spec.ts` | 14 | Reevaluación desde la interfaz; idempotencia comprobada contra la API |

**Resultado con el dataset real:** 4,164 episodios detectados desde 1970 en unos 3 segundos, de
los cuales 8 siguen vigentes.

---

## RF-02 — Proyección de tendencia a corto plazo

**Implementación:** `backend/src/ola/domain/projection.py`,
`services/projection_service.py`, `frontend/src/pages/Proyeccion.tsx`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_projection.py` | 32 | La regresión sigue una pendiente conocida; la media ponderada resiste un día atípico; ante una serie plana ambos coinciden; los huecos pesan en la pendiente |
| `tests/integration/test_projection.py` | 32 | Los dos métodos se devuelven juntos; todo el rango de 3 a 7 días; la confianza baja en zonas con datos antiguos |
| `src/pages/Proyeccion.test.tsx` | 13 | Las tres señales de advertencia están presentes |
| `src/components/graficos/datosProyeccion.test.ts` | 9 | El tramo estimado engancha con el último valor medido |
| `e2e/proyeccion.spec.ts` | 11 | Trazo punteado y fondo sombreado en el navegador real |

**Caso que justifica mostrar ambos modelos:** con seis registros fríos tras semanas neutras, la
regresión ya proyecta frío mientras la media ponderada aún lee neutro. La discrepancia es una
medida de incertidumbre, y está fijada en una prueba.

---

## RF-03 — Notificación automática

**Implementación:** `backend/src/ola/domain/messages.py`, `mail.py`,
`services/notification_service.py`, `frontend/src/pages/Avisos.tsx`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_messages.py` | 15 | El texto evita la jerga técnica, lleva la atribución a IMARPE y no menciona SMS |
| `tests/integration/test_notifications.py` | 34 | Un aviso por episodio; los fallos se reintentan; suscribirse a una alerta vigente avisa; subir el umbral no genera avisos falsos de cierre |
| `src/pages/Avisos.test.tsx` | 8 | Centro de avisos y marcado de leídos |
| `src/components/PanelEnvioAvisos.test.tsx` | 6 | Resumen del envío y aviso de reintento |
| `e2e/notificaciones.spec.ts` | 8 | **Correo entregado y verificado contra Mailpit**, no contra un simulacro |

---

## RF-04 — Mapa interactivo de estado por zona

**Implementación:** `backend/src/ola/services/status_service.py`,
`frontend/src/components/mapa/`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/integration/test_status.py` | 18 | Las 10 zonas con coordenadas; MATARANI sin datos recientes y sin alerta |
| `src/pages/Inicio.test.tsx` | 19 | Un círculo por zona, coloreado por estado; las zonas en alerta se agrandan |
| `src/components/mapa/PanelZona.test.tsx` | 8 | Detalle en lenguaje sencillo |
| `src/components/mapa/paleta.test.ts` | 7 | El encuadre se calcula de las coordenadas |
| `e2e/mapa.spec.ts` | 13 | Leaflet real con 10 zonas; atribución de OpenStreetMap; el panel no tapa el mapa en celular |

---

## RF-05 y RF-06 — Gráficos históricos y comparación

**Implementación:** `backend/src/ola/domain/series.py`, `services/series_service.py`,
`frontend/src/components/graficos/`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_series.py` | 26 | El agrupado según el rango; los periodos sin dato quedan marcados |
| `tests/integration/test_series.py` | 24 | 56 años caben en menos de 1,000 puntos; máximo de 4 zonas comparables |
| `src/components/graficos/datos.test.ts` | 20 | El eje vertical incluye el cero sin desperdiciar espacio |
| `src/components/graficos/paletaSeries.test.ts` | 15 | Cada serie usa color, forma y trazo distintos |
| `src/pages/Historico.test.tsx` | 10 | Selección de zona y rango |
| `src/pages/Comparacion.test.tsx` | 11 | Límite de zonas y leyenda obligatoria |
| `e2e/graficos.spec.ts` | 17 | **La línea se corta en los huecos**, comprobado sobre el trazado SVG real |

---

## RF-07 — Registro y autenticación

**Implementación:** `backend/src/ola/security.py`, `services/auth_service.py`,
`repositories/subscriptions_repo.py`, `frontend/src/auth/`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_security.py` | 12 | La contraseña nunca se guarda en claro; se rechazan las que bcrypt truncaría |
| `tests/integration/test_auth.py` | 22 | Registro, sesión, token vencido y cuenta desactivada |
| `tests/integration/test_auth_service.py` | 11 | El administrador se crea al arrancar y **dos procesos simultáneos no chocan** |
| `tests/integration/test_subscriptions.py` | 13 | Varias zonas por usuario, aisladas entre usuarios |
| `src/pages/MisZonas.test.tsx` | 7 | Seguir y abandonar zonas |
| `e2e/auth.spec.ts` | 9 | Registro, sesión persistente y cierre en el navegador |

---

## RF-08 — Importación del dataset ATSM

**Implementación:** `backend/src/ola/domain/csv_parser.py`, `services/import_service.py`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_csv_parser.py` | 46 | Marca de orden de bytes, `NaN`, laboratorio desconocido y **decimal escrito con coma** |
| `tests/integration/test_imports.py` | 30 | Importación parcial; reimportar actualiza sin duplicar; una fecha repetida no rompe la carga |
| `src/pages/Admin.test.tsx` | 9 | Resumen y detalle de filas rechazadas |
| `e2e/importacion.spec.ts` | 8 | Carga desde la interfaz sin alterar los datos reales |

**Requisito de rendimiento (sección 3.3 de la SRS):** el límite es de 2 minutos para un año de
histórico. Medido con el archivo completo de 56 años: **125,701 filas en 11.8 segundos**,
verificado también sobre las imágenes de producción. La prueba
`test_imports.py::TestDatasetCompleto` fija ese límite.

---

## Requisitos no funcionales

| Atributo (ISO 25010) | Evidencia |
|---|---|
| Usabilidad | Todos los textos en español, centralizados en `src/i18n/textos.ts`. Tabla accesible junto a cada gráfico y al mapa |
| Confiabilidad | La fecha del dato se muestra siempre; una zona sin mediciones recientes se marca y no se clasifica |
| Seguridad | Contraseñas con bcrypt; la aplicación **se niega a arrancar** en producción con un secreto débil o de plantilla (`test_config.py`) |
| Mantenibilidad | 688 pruebas, 95% de cobertura, ruff y mypy en modo estricto sin observaciones |
| Portabilidad | Todo en contenedores; el stack de producción se verificó completo en local |
| Rendimiento | Importación y agrupado de series medidos contra los límites de la sección 3.3 |

---

## Nota sobre la cobertura

El módulo `src/ola/startup.py`, que aplica las migraciones al desplegar, figura con 0% de
cobertura en el informe automático: solo se ejecuta al arrancar un contenedor de producción,
fuera del alcance de pytest. Se verificó a mano levantando el stack de producción desde una
base vacía, donde aplicó las cuatro migraciones y creó la cuenta de administrador. Las 58
pruebas de extremo a extremo que corren contra las imágenes de producción también dependen de
que ese arranque haya funcionado.
