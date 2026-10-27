# Bitácora de defectos
## Proyecto OLA — Observatorio Litoral de Anomalías térmicas

Cada defecto encontrado queda aquí, con cómo se detectó y qué costó corregirlo. De esta tabla
salen dos métricas del plan de calidad ([calidad.md](calidad.md)): la **densidad de defectos**
y el **costo de la no calidad**.

Cuenta como defecto cualquier comportamiento distinto de lo que pide la SRS o de lo que la
persona espera, y también **una verificación que dejó de verificar**: una prueba que pasa sin
comprobar nada es tan peligrosa como un error en el código, porque esconde a los demás.

## Cómo se registra

Al cerrar cada fase se añaden las filas nuevas con el siguiente ID libre. No se borran filas:
un defecto corregido sigue siendo evidencia.

| Campo | Valores |
|---|---|
| Severidad | **Crítica**: un dato incorrecto llega al usuario sin aviso, o el sistema entero cae. **Alta**: un RF no cumple, o una verificación deja de verificar. **Media**: falla parcial, con alternativa o solo en condiciones concretas. **Baja**: presentación o redacción |
| Detección | **Unitaria**, **Integración**, **E2E**, **Revisión** (de capturas, configuración o código), **Construcción/despliegue**, **Usuario** (llegó a producción) |
| Horas | Tiempo estimado de diagnóstico y corrección. Las filas anteriores a la bitácora se estimaron a partir del alcance del commit que las corrige |

## Registro

Los defectos D-01 a D-19 se tomaron de [decisiones.md](decisiones.md) (secciones 14 y 16.1),
donde se habían documentado antes de existir esta bitácora.

| ID | Fecha | Etapa | RF | Severidad | Detección | Qué pasaba | Corrección | Horas |
|---|---|---|---|---|---|---|---|---|
| D-01 | 2026-09-10 | Web inicial | RF-08 | Crítica | Unitaria | Un decimal escrito con coma se leía mal y el valor quedaba corrompido sin ningún aviso | `e60a4bb` | 1 |
| D-02 | 2026-09-10 | Web inicial | RF-08 | Alta | Integración | Una fecha repetida en el archivo abortaba la importación entera | `37261f0` | 1.5 |
| D-03 | 2026-09-10 | Web inicial | RF-08 | Media | Integración | El lector de texto cerraba el archivo que gestiona el servidor web | `37261f0` | 1 |
| D-04 | 2026-09-10 | Web inicial | RF-01 | Media | Integración | Dos constantes de estado HTTP obsoletas rompían las respuestas de validación | Antes del primer commit | 0.5 |
| D-05 | 2026-09-10 | Web inicial | RF-02, RF-05, RF-06 | Alta | E2E | Una respuesta tardía sobrescribía el resultado de la consulta actual en tres páginas | `407c39a` | 2 |
| D-06 | 2026-09-10 | Web inicial | Transversal | Media | E2E | La navegación desbordaba la pantalla del celular al crecer el menú | `18bfead` | 0.5 |
| D-07 | 2026-09-10 | Web inicial | RF-03 | Baja | Unitaria | Concordancia de género: «alerta cálido» | `e643ad4` | 0.25 |
| D-08 | 2026-09-10 | Web inicial | Transversal | Alta | Construcción/despliegue | La verificación de tipos del frontend no revisaba ningún archivo y escondía tres errores | `6c63d3f` | 2 |
| D-09 | 2026-09-10 | Web inicial | RF-07 | Media | Construcción/despliegue | Dos procesos que arrancaban a la vez chocaban al crear el administrador | `a9424e3` | 1.5 |
| D-10 | 2026-09-13 | Rediseño web | Transversal | Alta | Revisión | Vite dentro de Docker servía código antiguo: las pruebas visuales validaban una interfaz que ya no existía | `c05a1bf` | 2 |
| D-11 | 2026-09-13 | Rediseño web | Transversal | Media | Revisión | Con el sondeo de archivos, cada página tardaba más de 30 s en servirse | `c05a1bf` | 1 |
| D-12 | 2026-09-13 | Rediseño web | RF-07 | Alta | E2E | Sesiones recién iniciadas se rechazaban con 401 de forma intermitente: el reloj retrocedía y el token parecía emitido en el futuro | `462341b` | 3 |
| D-13 | 2026-09-13 | Rediseño web | RF-01 | Media | E2E | Una carga duplicada de la configuración podía pisar lo que el administrador escribía | `57ce6b8` | 1 |
| D-14 | 2026-09-13 | Rediseño web | RF-04 | Media | E2E | La tabla abierta ensanchaba toda la página en celular | `b502a3f` | 0.5 |
| D-15 | 2026-09-13 | Rediseño web | RF-04 | Baja | Revisión | La columna de alerta quedaba recortada en escritorio | `b502a3f` | 0.5 |
| D-16 | 2026-09-13 | Rediseño web | RF-04 | Baja | Revisión | «°C» quedaba solo en la línea siguiente al valor | `1141796` | 0.5 |
| D-17 | 2026-09-13 | Rediseño web | Transversal | Alta | Revisión | La tolerancia visual relativa (0.5 %) dejaba pasar cambios reales de texto | `1141796` | 1 |
| D-18 | 2026-09-13 | Rediseño web | RF-07 | Media | E2E | Con la carga diferida, el menú de cuenta abierto justo después de entrar se cerraba solo | `15d3d58` | 1 |
| D-19 | 2026-09-13 | Rediseño web | RF-04 | Alta | Revisión | El mapa base mostraba «API KEY REQUIRED»: CARTO pasó a exigir clave | `1141796` | 1 |
| D-20 | 2026-09-14 | App, fase 0 | Transversal | Media | Unitaria | `test_is_production_solo_es_verdadero_en_produccion` lee las variables del contenedor. Con la contraseña de administrador de la plantilla en `.env`, falla aunque el código esté bien: la prueba no es hermética | Fase 1 de la app (`backend/tests/conftest.py`) | 0.5 |
| D-21 | 2026-09-14 | App, fase 0 | Transversal | Media | E2E | El informe HTML de cobertura se escribía dentro de la carpeta que vigila Vite. Cada archivo nuevo recargaba las páginas y la preparación de las E2E esperó 30 s una página que no dejaba de recargarse | Fase 0 (`vite.config.ts`, `.gitignore`) | 0.5 |
| D-22 | 2026-09-15 | Despliegue | Transversal | Alta | Construcción/despliegue | Las etiquetas de Traefik de `compose.prod.yml` no unían los servicios a la red de Dokploy: los dominios no habrían respondido | `8b6c1f5` (rama `deploy`) | 1.5 |
| D-23 | 2026-09-15 | Despliegue | Transversal | Alta | Construcción/despliegue | El chequeo de salud de Nginx consultaba `localhost`, que en Alpine resuelve a IPv6: el contenedor nunca quedaba sano y Traefik respondía 404 | `cfa0d9c` (rama `deploy`) | 1 |
| D-24 | 2026-09-22 | App, fase 1 | RF-09 | Media | Unitaria | `useConsulta` repetía la consulta sin fin si la pantalla le pasaba una función escrita en línea: dependía de ella y cada dibujo creaba otra. La única pantalla que lo usaba pasaba una función estable, así que no llegó a verse; la prueba agotó la memoria de Jest | Fase 1 de la app (`mobile/src/useConsulta.ts`) | 0.5 |
| D-25 | 2026-09-22 | App, fase 1 | Transversal | Media | Unitaria | Dos pruebas de la web esperaban hasta 10 s a una pantalla de carga diferida, pero Vitest corta cada prueba a los 5 s. Sin cobertura duraban 3 s y pasaban; con cobertura se cortaban. Falló en la fase 0 (se atribuyó a la carga del equipo) y otra vez aquí | Fase 1 de la app (`frontend/src/App.test.tsx`) | 0.5 |
| D-26 | 2026-09-23 | App, fase 1 | RF-09 | Alta | Construcción/despliegue | La app no compilaba en Windows: la compilación C++ llegaba a rutas de 295 y 430 caracteres, por encima del límite de 260 de CMake y de su ninja 1.10. Sin APK no hay RF-09 | Fase 1 de la app (`.npmrc`, `mobile/plugins/compilacion-nativa-windows.js`) | 4 |
| D-27 | 2026-09-23 | App, fase 1 | RF-09 | Media | E2E | El puerto 8000 del celular de pruebas lo ocupaba otra app: `adb reverse` no podía llevar la API al celular y las E2E no podían empezar | Fase 1 de la app (puerto 18000 en `app.config.ts` y `scripts/android.mjs`) | 0.5 |
| D-28 | 2026-09-27 | App, fase 2 | RF-09 | Alta | E2E | Los marcadores del mapa se veían, pero TalkBack no los encontraba y tocarlos no abría la zona. MapLibre los mete en un contenedor nativo que para Android mide 0 × 0, y el toque llega a un evento nativo que la app no escuchaba. Las pruebas de Jest pasaban porque simulan el mapa | Fase 2 de la app: botones accesibles de 48 dp sobre cada marcador, ubicados con `project()` de MapLibre (`MapaZonas.tsx`) | 2.5 |
| D-29 | 2026-09-27 | App, fase 2 | RF-09 | Media | E2E | Cuatro flujos de Maestro fallaban sin que la app fallara: con la pantalla Mapa, más larga, `scrollUntilVisible` agotaba sus 20 s; un arrastre y un doble toque caían fuera del mapa, y un aviso de 1.5 s desaparecía antes de que Maestro revisara la pantalla | Fase 2 de la app: 60 s para desplazarse, gestos sobre el elemento del mapa y el aviso probado en Jest (`.maestro/`) | 1 |
| D-30 | 2026-09-27 | App, fase 3 | Transversal | Baja | Revisión | La API respondía sin tildes: «No existe un laboratorio con el codigo», «El archivo esta vacio», «Fecha invalida», «contrasena». La web y la app muestran ese texto tal cual. Salió al revisar los mensajes de error de los formularios de la app | `1b3f1e5`, `bf19bca` | 1 |
| D-31 | 2026-09-27 | App, fase 3 | Transversal | Alta | Integración | La base de pruebas nunca recibía los cambios de esquema: `create_all` no modifica una tabla que ya existe. Al añadir una columna, las pruebas fallaron; un cambio que no rompiera una consulta habría seguido probándose contra el esquema viejo sin que nadie lo notara | `51e17be` | 1 |
| D-32 | 2026-09-27 | App, fase 3 | RF-09 | Media | E2E | Al entrar, crear la cuenta o cambiar la contraseña, Samsung Pass ofrecía guardarla, aunque la fase decidió no usar el autocompletado y cada campo lo tenía apagado (`autoComplete="off"`). Desde Android 14 el sistema pide autocompletar también los campos marcados como no importantes (`trigger_fill_request_on_unimportant_view`, activo en el celular de pruebas). La ventana tapaba la app y detuvo cuatro de los cinco flujos de cuenta. Jest no podía verlo: no hay servicio de autocompletado en la simulación | Fase 3 de la app: módulo nativo propio que cancela la sesión de autocompletado al enfocar cada campo y al dejar el formulario (`mobile/modules/autocompletado/`) | 2.5 |
| D-33 | 2026-09-28 | App, fase 3 | RF-09 | Media | Revisión | En Mis zonas solo el interruptor de Android respondía al toque, y mide 47 × 27 dp: la mitad de los 48 dp que pide la guía de diseño, en la pantalla que más usa el pescador para elegir sus zonas. Jest lo daba por bueno porque tenía nombre y estado. Salió al revisar en el celular la jerarquía de accesibilidad de las pantallas nuevas (`uiautomator dump`), la acción que dejó la retrospectiva de la fase 2 | Fase 3 de la app: toda la fila, de 64 dp, es el interruptor (`mobile/src/app/mis-zonas.tsx`) | 0.75 |

## Resumen

Totales al cerrar la fase 3 de la aplicación móvil (2026-09-28).

| Severidad | Defectos |
|---|---|
| Crítica | 1 |
| Alta | 12 |
| Media | 16 |
| Baja | 4 |
| **Total** | **33** (ninguno abierto) |

| Detección | Defectos | Lectura |
|---|---|---|
| Unitaria | 5 | Los más baratos: aparecen al escribir o correr el código. D-20 y D-25 son defectos de la propia prueba |
| Integración | 4 | Tres en la importación, donde el backend toca archivos y base de datos. D-31 era de la propia base de pruebas |
| E2E | 11 | La capa que más encontró: tiempos, sesiones, diseño en celular y el entorno de pruebas. D-28 y D-32 solo podían salir aquí: las pruebas unitarias simulan el mapa nativo y no tienen servicio de autocompletado |
| Revisión | 7 | Dos eran verificaciones que no verificaban (D-10, D-17) y otro, un fallo que las pruebas no podían ver (D-19). D-33 salió de revisar en el celular el árbol de accesibilidad |
| Construcción/despliegue | 6 | D-08 es el más grave de su tipo: la puerta de calidad estaba abierta. D-22 y D-23 salieron al desplegar en el VPS; D-26, al compilar la app en Windows |
| Usuario | 0 | Ningún defecto llegó a producción |

| RF | Defectos |
|---|---|
| RF-01 | 2 |
| RF-02, RF-05, RF-06 (un mismo defecto) | 1 |
| RF-03 | 1 |
| RF-04 | 4 |
| RF-07 | 3 |
| RF-08 | 3 |
| RF-09 | 7 |
| Transversal (entorno, verificación, navegación, despliegue, mensajes) | 12 |

Horas estimadas de corrección: **39.5 h**, todos cerrados. Su valor en soles y su lectura como
costo de falla interna están en [calidad.md](calidad.md), sección 8.
