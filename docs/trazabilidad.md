# Matriz de trazabilidad de requisitos

## Proyecto OLA — Observatorio Litoral de Anomalías térmicas

Este documento conecta cada requisito funcional de la [SRS](requisitos.md) con el código que lo
implementa y con las pruebas que demuestran que funciona. Complementa la matriz de la sección 4
de la SRS, que reparte responsables, añadiendo la evidencia de cumplimiento.

**Fecha:** 2026-09-23 · **Versión de la SRS:** 1.7

---

## Resumen

| Suite | Pruebas | Qué cubre |
|---|---|---|
| Backend — unitarias | 213 | Lógica de dominio pura, sin base de datos |
| Backend — integración | 230 | Endpoints, persistencia y permisos |
| Paquete compartido — Vitest | 135 | Lógica de presentación, contrato con la API y paleta de colores, que usan la web y la app móvil |
| Web — Vitest | 243 | Componentes y páginas; axe en cada componente nuevo |
| Extremo a extremo — Playwright | 167 | Navegador real en escritorio y en celular emulado: comportamiento, accesibilidad y regresión visual |
| Rendimiento — Playwright | 2 | Build de producción con 4G normal |
| Herramientas de calidad — pytest | 8 | Cálculo de la disponibilidad a partir de los chequeos de Uptime Kuma |
| App móvil — Jest | 69 | Configuración por variante, marco, pantallas y navegación con las rutas reales |
| App móvil — Maestro | 6 | Flujos sobre el APK de release en un celular real |
| **Total** | **1,073** | |

Cobertura de sentencias: **95 %** en el backend, **97.5 %** en el paquete compartido, **89.9 %**
en la web y **91.1 %** en la app. Las metas y su evolución por fase están en [calidad.md](calidad.md), sección 7.

Playwright lista 189 casos entre sus tres proyectos (escritorio, celular y backend en serie); 22 se
omiten a propósito porque son de escritorio o de celular y no aplican en el otro.

Las suites se ejecutan con:

```bash
docker compose exec api pytest --cov=ola     # backend
docker compose exec -w /repo/packages/compartido web pnpm test   # paquete compartido
docker compose exec web pnpm test            # web
docker compose --profile e2e run --rm e2e    # extremo a extremo
docker compose --profile e2e run --rm e2e sh -c "corepack enable && corepack prepare pnpm@9.15.2 --activate && pnpm install --frozen-lockfile --filter ola-frontend... && pnpm test:rendimiento"   # rendimiento
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
| RF-09 | Aplicación móvil Android | En construcción: fases 0 y 1 de 6 | v1.7 — requisito nuevo; el catálogo pasa de 8 RF |

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
| `packages/compartido/src/graficos/datosProyeccion.test.ts` | 9 | El tramo estimado engancha con el último valor medido |
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
| `src/pages/Avisos.test.tsx` | 10 | Centro de avisos, marcado de leídos y actualización del contador del marco |
| `src/avisos/AvisosProvider.test.tsx` | 5 | El número de avisos sin leer se pide con sesión y se refresca al cambiar de pantalla |
| `src/components/PanelEnvioAvisos.test.tsx` | 6 | Resumen del envío y aviso de reintento |
| `e2e/notificaciones.spec.ts` | 8 | **Correo entregado y verificado contra Mailpit**, no contra un simulacro; el marco deja de anunciar los avisos al marcarlos |

---

## RF-04 — Mapa interactivo de estado por zona

**Implementación:** `backend/src/ola/services/status_service.py`,
`frontend/src/pages/Inicio.tsx`, `frontend/src/components/mapa/`, `frontend/src/components/inicio/`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/integration/test_status.py` | 18 | Las 10 zonas con coordenadas; MATARANI sin datos recientes y sin alerta |
| `src/pages/Inicio.test.tsx` | 33 | Resumen, tarjetas con las alertas primero, tabla, hoja o panel según el ancho, zona leída de la dirección, carga, error y ausencia de datos |
| `src/components/inicio/ResumenEstado.test.tsx` | 10 | Fecha y antigüedad del dato, resaltada si supera la vigencia; zonas en alerta; conteo que incluye estados vacíos |
| `packages/compartido/src/inicio/datos.test.ts` | 21 | Fechas sin desfase horario en Perú, orden de las zonas, grados con signo, «y» / «e» |
| `src/components/inicio/TarjetasZonas.test.tsx` | 11 | Promedio respecto a lo normal, zona sin datos y línea de alerta |
| `src/components/inicio/Estado.test.tsx` | 7 | Una forma distinta por estado, además del color |
| `src/components/TablaEstado.test.tsx` | 8 | La tabla accesible con fechas, alertas y selección |
| `src/components/mapa/DetalleZona.test.tsx` | 14 | Detalle en lenguaje sencillo; recibir y dejar de recibir avisos |
| `src/components/mapa/HojaInferior.test.tsx` | 11 | Diálogo modal: foco atrapado y devuelto, Escape, fondo y deslizamiento |
| `src/components/mapa/PanelZona.test.tsx` | 5 | Invitación y accesos directos a las zonas en alerta |
| `src/components/mapa/marcador.test.ts` | 8 | Símbolo por estado, anillo de alerta y nombre accesible escapado |
| `packages/compartido/src/mapa/paleta.test.ts` | 26 | Contraste medido de cada color de estado; encuadre calculado de las coordenadas |
| `e2e/mapa.spec.ts` | 12 | Leaflet real con 10 zonas; atribución de OpenStreetMap; elección con ratón y teclado |
| `e2e/inicio.spec.ts` | 20 | Resumen, tabla y tarjetas en escritorio y celular; «Reintentar» tras un fallo |
| `e2e/detalle.spec.ts` | 23 | Hoja inferior, gestos del mapa, panel lateral y avisos reales desde el detalle |
| `e2e/rendimiento.spec.ts` | 2 | **El mapa muestra las 10 zonas en 1.07 s (mediana) con 4G normal**; la portada pesa 170 kB comprimidos |

---

## RF-05 y RF-06 — Gráficos históricos y comparación

**Implementación:** `backend/src/ola/domain/series.py`, `services/series_service.py`,
`frontend/src/components/graficos/`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_series.py` | 26 | El agrupado según el rango; los periodos sin dato quedan marcados |
| `tests/integration/test_series.py` | 24 | 56 años caben en menos de 1,000 puntos; máximo de 4 zonas comparables |
| `packages/compartido/src/graficos/datos.test.ts` | 20 | El eje vertical incluye el cero sin desperdiciar espacio |
| `packages/compartido/src/graficos/paletaSeries.test.ts` | 15 | Cada serie usa color, forma y trazo distintos |
| `src/pages/Historico.test.tsx` | 12 | Selección de zona y rango; abre la zona indicada en la dirección |
| `src/pages/Comparacion.test.tsx` | 11 | Límite de zonas y leyenda obligatoria |
| `e2e/graficos.spec.ts` | 17 | **La línea se corta en los huecos**, comprobado sobre el trazado SVG real |

---

## RF-07 — Registro y autenticación

**Implementación:** `backend/src/ola/security.py`, `services/auth_service.py`,
`repositories/subscriptions_repo.py`, `frontend/src/auth/`

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_security.py` | 15 | La contraseña nunca se guarda en claro; se rechazan las que bcrypt truncaría; un reloj que retrocede unos segundos no invalida una sesión recién iniciada |
| `tests/integration/test_auth.py` | 22 | Registro, sesión, token vencido y cuenta desactivada |
| `tests/integration/test_auth_service.py` | 11 | El administrador se crea al arrancar y **dos procesos simultáneos no chocan** |
| `tests/integration/test_subscriptions.py` | 13 | Varias zonas por usuario, aisladas entre usuarios |
| `src/pages/MisZonas.test.tsx` | 7 | Seguir y abandonar zonas |
| `src/components/marco/MenuCuenta.test.tsx` | 12 | Sesión, rol y opciones por rol; cierre con Escape o al pulsar fuera |
| `src/components/marco/Cabecera.test.tsx` | 6 | Entrar sin sesión, menú con sesión y nada mientras se revalida |
| `src/App.test.tsx` | 9 | Iniciar y cerrar sesión desde el marco; carga diferida de las pantallas |
| `e2e/auth.spec.ts` | 9 | Registro, sesión persistente y cierre en el navegador |
| `e2e/marco.spec.ts` | 28 | Menú de cuenta, barra inferior y banda en escritorio y celular |

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

## RF-09 — Aplicación móvil Android

**Estado:** en construcción por fases (plan en [calidad.md](calidad.md), sección 13). Fases 0
y 1 cerradas: paquete compartido y marco de la app. La app ya muestra la fecha del dato leída
de la API real.

**Implementación:** `packages/compartido/` (tipos y cliente de la API, lógica, textos y paleta)
y `mobile/` (Expo con expo-router).

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `packages/compartido/src/api/cliente.test.ts` | 33 | El cliente acepta un almacén de token síncrono (web) o asíncrono (app); cada función pide la ruta y el método que espera FastAPI; los errores de FastAPI y Pydantic llegan como mensajes legibles |
| `packages/compartido/src/tema/colores.test.ts` | 11 | Cada par de texto y fondo que usan la web y la app supera 4.5:1 |
| `frontend/src/tema.test.ts` | 2 | `tema.css` y la paleta de la app dicen lo mismo; un color cambiado en un solo lado falla |
| `mobile/pruebas/config.test.ts` | 15 | Cada variante apunta a su API; solo la demo exige HTTPS; Android 10 como mínimo; fuentes, ícono y arranque existen |
| `mobile/pruebas/compilacion-nativa-windows.test.ts` | 5 | El plugin de compilación usa un CMake con ninja 1.12 y compila fuera de `node_modules/.pnpm` |
| `mobile/src/componentes/marco/Banda.test.tsx` | 7 | Entrar sin sesión; botón de cuenta con los avisos sin leer, en singular y plural; letra limitada al 130 % |
| `mobile/src/componentes/marco/BarraInferior.test.tsx` | 6 | Las cuatro pantallas en el orden de la web, la actual seleccionada, 64 dp de alto y letra hasta el 150 % |
| `mobile/src/componentes/marco/HojaCuenta.test.tsx` | 13 | Sesión y rol; nota de administración en la web; se cierra con «atrás», tocando fuera o al elegir |
| `mobile/pruebas/mapa.test.tsx` | 9 | Fecha del dato en dd/mm/aaaa, sin datos, error con «Reintentar» y hito de rendimiento |
| `mobile/pruebas/navegacion.test.tsx` | 7 | Las rutas reales de expo-router: cada pestaña, Entrar y la hoja de cuenta llevan a su pantalla |
| `mobile/src/useConsulta.test.ts` | 4 | Una respuesta tardía no pisa la del reintento (D-05, D-24) |
| `mobile/src/componentes/pantalla/ErrorInesperado.test.tsx` | 3 | Un fallo al dibujar no cierra la app ni muestra el mensaje técnico |
| `mobile/.maestro/marco/` | 4 flujos | En el celular: arranque con la fecha del dato, las pestañas, Entrar y «atrás», atribución a IMARPE |
| `mobile/.maestro/sin-conexion/reintentar.yaml` | 1 flujo | Sin API la app lo explica; al volver la API, «Reintentar» recupera el estado |
| `mobile/.maestro/letra/letra-grande.yaml` | 1 flujo | Con la letra del celular al 200 % se ven las cuatro pestañas y todo el contenido |

**Rendimiento (SRS 3.3):** el estado se ve en una mediana de **0.64 s** desde que se abre la app
en frío (peor de 5: 1.75 s), en un Galaxy A56 con Android 16. El límite es de 5 s.

**APK de demostración:** instalado en el mismo celular sin conexión al equipo, muestra «Datos del
mar al 31/07/2026», la fecha que devuelve el VPS por HTTPS (prueba manual del 2026-09-23).

---

## Requisitos no funcionales

| Atributo (ISO 25010) | Evidencia |
|---|---|
| Usabilidad | Todos los textos en español, centralizados en `src/i18n/textos.ts`. Interfaz móvil primero con barra inferior; cada estado con color, símbolo y nombre; tabla accesible junto a cada gráfico y al mapa. Guía en [diseno.md](diseno.md) |
| Accesibilidad | axe (WCAG 2.2 AA) **bloqueante** en todas las pantallas, en escritorio y celular, y en las pruebas de cada componente nuevo. Excepción documentada: tamaño de objetivo de los marcadores del mapa (WCAG 2.5.8, «equivalente») |
| Confiabilidad | La fecha del dato se muestra siempre; una zona sin mediciones recientes se marca y no se clasifica |
| Seguridad | Contraseñas con bcrypt; la aplicación **se niega a arrancar** en producción con un secreto débil o de plantilla (`test_config.py`) |
| Mantenibilidad | 1,073 pruebas; cobertura del 95 % en el backend, 97.5 % en el paquete compartido, 89.9 % en la web y 91.1 % en la app; ruff y mypy en modo estricto sin observaciones; regresión visual con tolerancia de 20 píxeles |
| Disponibilidad | Uptime Kuma consulta `/api/health/ready` del equipo y del VPS cada minuto. Semana al 23 de septiembre: 99.07 % y 96.72 %. Meta: 95 % objetivo, 90 % mínimo ([calidad.md](calidad.md), sección 7) |
| Portabilidad | Todo en contenedores; el stack de producción se verificó completo en local |
| Rendimiento | Importación y agrupado de series medidos contra los límites de la sección 3.3. El mapa muestra las 10 zonas en una mediana de 1.07 s con 4G normal (límite: 3 s) y la portada descarga 170 kB comprimidos (`e2e/rendimiento.spec.ts`) |

---

## Nota sobre la cobertura

El módulo `src/ola/startup.py`, que aplica las migraciones al desplegar, figura con 0% de
cobertura en el informe automático: solo se ejecuta al arrancar un contenedor de producción,
fuera del alcance de pytest. Se verificó a mano levantando el stack de producción desde una
base vacía, donde aplicó las cuatro migraciones y creó la cuenta de administrador. Las 58
pruebas de extremo a extremo que corren contra las imágenes de producción también dependen de
que ese arranque haya funcionado.
