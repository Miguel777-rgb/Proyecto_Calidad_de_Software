# Matriz de trazabilidad de requisitos

## Proyecto OLA — Observatorio Litoral de Anomalías térmicas

Este documento conecta cada requisito funcional de la [SRS](requisitos.md) con el código que lo
implementa y con las pruebas que demuestran que funciona. Complementa la matriz de la sección 4
de la SRS, que reparte responsables, añadiendo la evidencia de cumplimiento.

**Fecha:** 2026-09-27 · **Versión de la SRS:** 1.8

---

## Resumen

| Suite | Pruebas | Qué cubre |
|---|---|---|
| Backend — unitarias | 225 | Lógica de dominio pura, sin base de datos |
| Backend — integración | 263 | Endpoints, persistencia y permisos |
| Paquete compartido — Vitest | 165 | Lógica de presentación, contrato con la API y paleta de colores, que usan la web y la app móvil |
| Web — Vitest | 253 | Componentes y páginas; axe en cada componente nuevo |
| Extremo a extremo — Playwright | 171 | Navegador real en escritorio y en celular emulado: comportamiento, accesibilidad y regresión visual |
| Rendimiento — Playwright | 2 | Build de producción con 4G normal |
| Herramientas de calidad — pytest | 8 | Cálculo de la disponibilidad a partir de los chequeos de Uptime Kuma |
| App móvil — Jest | 198 | Configuración por variante, marco, estado guardado, mapa, detalle, sesión, cuenta y zonas, y navegación con las rutas reales |
| App móvil — Maestro | 17 | Flujos sobre el APK de release en un celular real, con la API cortada, en modo avión y con el correo real de Mailpit |
| **Total** | **1,302** | |

Cobertura de sentencias: **95 %** en el backend, **97.7 %** en el paquete compartido, **90.4 %**
en la web y **95.9 %** en la app. Las metas y su evolución por fase están en [calidad.md](calidad.md), sección 7.

Playwright lista 193 casos entre sus tres proyectos (escritorio, celular y backend en serie); 22 se
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
| RF-07 | Registro y autenticación | Implementado | v1.8 — recuperación de contraseña con un código y sesión de 30 días en la app |
| RF-08 | Importación del dataset | Implementado | v1.2 — **solo manual**, sin tarea programada |
| RF-09 | Aplicación móvil Android | En construcción: fases 0 a 3 de 6 | v1.7 — requisito nuevo; el catálogo pasa de 8 RF |

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
| `tests/unit/test_messages.py` | 18 | El texto evita la jerga técnica, lleva la atribución a IMARPE y no menciona SMS. El correo de recuperación trae el código y su vigencia, y ningún enlace |
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
| `packages/compartido/src/inicio/datos.test.ts` | 24 | Fechas sin desfase horario en Perú, orden de las zonas, grados con signo, «y» / «e», fecha y hora de los datos guardados en la app |
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
`repositories/subscriptions_repo.py`, `repositories/password_reset_repo.py`, `frontend/src/auth/`,
`frontend/src/pages/Recuperar.tsx`; en la app, `mobile/src/sesion.tsx`,
`mobile/src/suscripciones.tsx` y las pantallas de cuenta (sección RF-09)

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `tests/unit/test_security.py` | 19 | La contraseña nunca se guarda en claro; se rechazan las que bcrypt truncaría; un reloj que retrocede unos segundos no invalida una sesión recién iniciada. El código de recuperación tiene 6 dígitos y se guarda como HMAC, distinto para cada usuario |
| `tests/unit/test_sesiones.py` | 5 | Un token emitido antes del cambio de contraseña deja de valer; uno del mismo segundo o posterior sigue valiendo, y uno sin fecha de emisión no |
| `tests/integration/test_password_reset.py` | 31 | Mismo mensaje exista o no la cuenta y aunque el correo falle; un código por minuto; el nuevo anula al anterior; 15 minutos y 5 intentos; el cambio cierra las demás sesiones y deja la sesión iniciada; sesión de 30 días solo si se pide; mensajes con tildes |
| `tests/integration/test_migraciones.py` | 2 | Las migraciones sobre una base vacía coinciden con los modelos; la de recuperación baja y vuelve a subir (D-31) |
| `tests/integration/test_auth.py` | 22 | Registro, sesión, token vencido y cuenta desactivada |
| `tests/integration/test_auth_service.py` | 11 | El administrador se crea al arrancar y **dos procesos simultáneos no chocan** |
| `tests/integration/test_subscriptions.py` | 13 | Varias zonas por usuario, aisladas entre usuarios |
| `src/pages/MisZonas.test.tsx` | 7 | Seguir y abandonar zonas |
| `src/pages/Recuperar.test.tsx` | 9 | Los dos pasos; correo, código y contraseña se validan antes de llamar a la API; el mismo mensaje exista o no la cuenta; el código vencido; otro código después de un minuto; axe en los dos pasos |
| `src/pages/Entrar.test.tsx` | 5 | Sesión guardada, credenciales incorrectas, cuenta desactivada y los enlaces a Crear cuenta y a Recuperar |
| `packages/compartido/src/validacion.test.ts` | 17 | Correo, código de 6 dígitos y largo de la contraseña, las mismas reglas en la web y la app |
| `src/components/marco/MenuCuenta.test.tsx` | 12 | Sesión, rol y opciones por rol; cierre con Escape o al pulsar fuera |
| `src/components/marco/Cabecera.test.tsx` | 6 | Entrar sin sesión, menú con sesión y nada mientras se revalida |
| `src/App.test.tsx` | 9 | Iniciar y cerrar sesión desde el marco; carga diferida de las pantallas |
| `e2e/auth.spec.ts` | 9 | Registro, sesión persistente y cierre en el navegador |
| `e2e/recuperar.spec.ts` | 3 | Con el código real que llega a Mailpit se cambia la contraseña y se entra; un correo sin cuenta recibe la misma respuesta y ningún correo; un código equivocado se rechaza |
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
a 3 cerradas: paquete compartido, marco de la app, pestaña Mapa, que lleva RF-04 al celular
con lectura sin conexión, y la cuenta con sus zonas de interés (RF-07).

**Implementación:** `packages/compartido/` (tipos y cliente de la API, lógica, textos y paleta)
y `mobile/` (Expo con expo-router y MapLibre). El estado del mar vive en
`mobile/src/estado/`; la pestaña Mapa en `mobile/src/app/(tabs)/index.tsx` y el detalle en
`mobile/src/app/zona/[code].tsx`. La sesión vive en `mobile/src/sesion.tsx`, las zonas seguidas en
`mobile/src/suscripciones.tsx` y las pantallas de cuenta en `mobile/src/app/` (`entrar`,
`registro`, `recuperar` y `mis-zonas`).

| Prueba | Nº | Qué demuestra |
|---|---|---|
| `packages/compartido/src/api/cliente.test.ts` | 41 | El cliente acepta un almacén de token síncrono (web) o asíncrono (app); cada función pide la ruta y el método que espera FastAPI; los errores de FastAPI y Pydantic llegan como mensajes legibles; un 401 con token avisa que la sesión terminó, uno sin token no |
| `packages/compartido/src/tema/colores.test.ts` | 13 | Cada par de texto y fondo que usan la web y la app supera 4.5:1 |
| `frontend/src/tema.test.ts` | 2 | `tema.css` y la paleta de la app dicen lo mismo; un color cambiado en un solo lado falla |
| `mobile/pruebas/config.test.ts` | 15 | Cada variante apunta a su API; solo la demo exige HTTPS; Android 10 como mínimo; fuentes, ícono y arranque existen |
| `mobile/pruebas/compilacion-nativa-windows.test.ts` | 5 | El plugin de compilación usa un CMake con ninja 1.12 y compila fuera de `node_modules/.pnpm` |
| `mobile/src/componentes/marco/Banda.test.tsx` | 7 | Entrar sin sesión; botón de cuenta con los avisos sin leer, en singular y plural; letra limitada al 130 % |
| `mobile/src/componentes/marco/BarraInferior.test.tsx` | 6 | Las cuatro pantallas en el orden de la web, la actual seleccionada, 64 dp de alto y letra hasta el 150 % |
| `mobile/src/componentes/marco/HojaCuenta.test.tsx` | 13 | Sesión y rol; nota de administración en la web; se cierra con «atrás», tocando fuera o al elegir |
| `mobile/pruebas/navegacion.test.tsx` | 14 | Las rutas reales de expo-router: cada pestaña, Entrar y la hoja de cuenta; una tarjeta o un marcador abren `/zona/CALLAO`; cerrar vuelve al mapa; una zona que no existe lo dice |
| `mobile/src/useConsulta.test.ts` | 4 | Una respuesta tardía no pisa la del reintento (D-05, D-24) |
| `mobile/src/componentes/pantalla/ErrorInesperado.test.tsx` | 3 | Un fallo al dibujar no cierra la app ni muestra el mensaje técnico |
| `mobile/src/estado/guardado.test.ts` | 9 | Lo guardado se lee igual; un contenido roto o de otro formato se ignora; si el almacenamiento falla, la app sigue |
| `mobile/src/estado/EstadoMar.test.tsx` | 14 | Abre con lo guardado y pone lo de la API; sin conexión se queda con lo guardado y lo dice; sin configuración usa la vigencia por defecto; una respuesta vieja no pisa la nueva; al volver la red actualiza sola |
| `mobile/pruebas/inicio.test.tsx` | 17 | La pestaña Mapa con la API simulada: esqueleto, resumen, un marcador y una tarjeta por zona, alertas primero, aviso de datos guardados, tirar para actualizar y el hito de arranque solo con datos de la API |
| `mobile/src/componentes/inicio/ResumenEstado.test.tsx` | 7 | Fecha sin desfase, antigüedad resaltada solo pasada la vigencia, zonas en alerta con nombre, conteo con los estados sin zonas |
| `mobile/src/componentes/inicio/TarjetasZonas.test.tsx` | 6 | Promedio, último dato, línea de alerta y zona que ya no mide, como la web |
| `mobile/src/componentes/inicio/AvisoGuardado.test.tsx` | 2 | Dice la fecha y la hora locales del guardado y ofrece reintentar |
| `mobile/src/componentes/inicio/Esqueleto.test.tsx` | 3 | TalkBack anuncia la carga; quieto si el celular pide menos movimiento |
| `mobile/src/componentes/mapa/MapaZonas.test.tsx` | 23 | Encuadre de toda la costa; un dedo no mueve el mapa y avisa, dos sí; un botón accesible de 48 dp sobre cada zona, quitado mientras se mueve el mapa; «Ver toda la costa»; atribución del mapa base |
| `mobile/src/componentes/zona/DetalleZona.test.tsx` | 7 | Promedio, valor medido, alerta completa o por qué no la hay; una zona que ya no mide no ofrece avisos |
| `mobile/src/sesion.test.tsx` | 11 | Al abrir, la sesión guardada se confirma con la API; sin red se conserva; vencida se cierra sin avisar. Entrar, crear la cuenta y cambiar la contraseña piden la sesión de 30 días y guardan el token cifrado. Un 401 a mitad de uso la cierra y lo avisa. Salir borra lo guardado |
| `mobile/src/suscripciones.test.tsx` | 6 | Sin sesión no pide nada; seguir y dejar una zona; un error no cambia la zona y se explica; reintentar; al salir se olvidan |
| `mobile/pruebas/cuenta.test.tsx` | 23 | Entrar, Crear cuenta, Recuperar y Mis zonas con las rutas reales: validación antes de llamar a la API, errores del backend, el ojo de la contraseña, sin autocompletado (se cancela al enfocar cada campo y al dejar la pantalla, D-32), volver adonde se estaba, aviso de sesión terminada y avisos desde el detalle |
| `mobile/modules/autocompletado/index.test.ts` | 3 | Llama al módulo nativo que cancela el autocompletado; sin el módulo, o si Android rechaza la cancelación, la app sigue |
| `mobile/.maestro/marco/` | 4 flujos | En el celular: arranque con la fecha del dato, las pestañas, Entrar y «atrás», atribución a IMARPE |
| `mobile/.maestro/inicio/` | 4 flujos | Las 10 zonas en el mapa y las tarjetas del dataset real; el detalle abre desde tarjeta y marcador y cierra con «atrás», deslizando o con ✕; sus acciones llevan a Entrar e Histórico; un dedo no mueve el mapa y el doble toque sí |
| `mobile/.maestro/sin-conexion/` | 3 flujos | Sin API y sin nada guardado ofrece reintentar; con datos guardados los muestra con su fecha y hora; en modo avión, al volver la red se actualiza sola |
| `mobile/.maestro/cuenta/` | 5 flujos | En el celular: crear la cuenta, cerrar y abrir la app sin perder la sesión y cerrarla; errores de correo, contraseña y cuenta repetida; seguir una zona desde el detalle y otra desde Mis zonas; volver a la zona después de entrar; recuperar la contraseña con el código real de Mailpit |
| `mobile/.maestro/letra/letra-grande.yaml` | 1 flujo | Con la letra del celular al 200 % se ven las pestañas, el resumen, las tarjetas y el formulario de Entrar |

**Rendimiento (SRS 3.3):** con el mapa, el estado se ve en una mediana de **0.81 s** desde que
se abre la app en frío (peor de 5: 0.84 s), en un Galaxy A56 con Android 16. Medido al cerrar
la fase 3. La medida espera
los datos de la API, las tarjetas y los 10 marcadores en su lugar. El límite es de 5 s.

**Evidencia en el celular:** [la pestaña Mapa](evidencia/app-mapa.png),
[el aviso de gestos](evidencia/app-aviso-gestos.png), que dura 1.5 s y Maestro no alcanza a ver,
[Mis zonas](evidencia/app-mis-zonas.png) con dos zonas seguidas y
[Entrar con el teclado abierto](evidencia/app-entrar-teclado.png), donde el campo y el botón
siguen a la vista. Al cerrar la fase 3 se revisó en el celular el árbol de accesibilidad de
Entrar, Crear cuenta, Recuperar, Mis zonas y el detalle con sesión (`uiautomator dump`): cada
control tiene nombre y mide al menos 48 dp, salvo el ✕ del detalle (44 dp, con 4 dp de margen
táctil que llevan el área a 52). La revisión encontró D-33.

**APK de demostración:** instalado en el mismo celular sin conexión al equipo, muestra «Datos del
mar al 31/07/2026», la fecha que devuelve el VPS por HTTPS (prueba manual del 2026-09-23).

---

## Requisitos no funcionales

| Atributo (ISO 25010) | Evidencia |
|---|---|
| Usabilidad | Todos los textos en español, centralizados en `src/i18n/textos.ts`. Interfaz móvil primero con barra inferior; cada estado con color, símbolo y nombre; tabla accesible junto a cada gráfico y al mapa. Guía en [diseno.md](diseno.md) |
| Accesibilidad | axe (WCAG 2.2 AA) **bloqueante** en todas las pantallas, en escritorio y celular, y en las pruebas de cada componente nuevo. Excepción documentada: tamaño de objetivo de los marcadores del mapa (WCAG 2.5.8, «equivalente») |
| Confiabilidad | La fecha del dato se muestra siempre; una zona sin mediciones recientes se marca y no se clasifica |
| Seguridad | Contraseñas con bcrypt; la aplicación **se niega a arrancar** en producción con un secreto débil o de plantilla (`test_config.py`). El código de recuperación se guarda como HMAC y no revela qué correos tienen cuenta (`test_password_reset.py`). En la app, el token va cifrado con el Keystore de Android (`sesion.test.tsx`) |
| Mantenibilidad | 1,302 pruebas; cobertura del 95 % en el backend, 97.7 % en el paquete compartido, 90.4 % en la web y 95.9 % en la app; ruff y mypy en modo estricto sin observaciones; regresión visual con tolerancia de 20 píxeles |
| Disponibilidad | Uptime Kuma consulta `/api/health/ready` del equipo y del VPS cada minuto. Semana al 28 de septiembre: 99.61 % y 98.80 %. Meta: 95 % objetivo, 90 % mínimo ([calidad.md](calidad.md), sección 7) |
| Portabilidad | Todo en contenedores; el stack de producción se verificó completo en local |
| Rendimiento | Importación y agrupado de series medidos contra los límites de la sección 3.3. El mapa muestra las 10 zonas en una mediana de 0.88 s con 4G normal (límite: 3 s) y la portada descarga 171 kB comprimidos (`e2e/rendimiento.spec.ts`) |

---

## Nota sobre la cobertura

El módulo `src/ola/startup.py`, que aplica las migraciones al desplegar, figura con 0% de
cobertura en el informe automático: solo se ejecuta al arrancar un contenedor de producción,
fuera del alcance de pytest. Se verificó a mano levantando el stack de producción desde una
base vacía, donde aplicó las cuatro migraciones y creó la cuenta de administrador. Las 58
pruebas de extremo a extremo que corren contra las imágenes de producción también dependen de
que ese arranque haya funcionado.
