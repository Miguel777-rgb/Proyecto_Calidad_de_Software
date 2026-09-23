# Registro de decisiones de diseño

## Proyecto OLA — Observatorio Litoral de Anomalías térmicas

Este documento recoge las decisiones tomadas durante el desarrollo, su motivo y qué se
descartó. Sirve como material para el artículo IEEE del Hito 2 y para que cualquiera que
retome el código entienda por qué está hecho así.

Las decisiones que cambiaron el catálogo de requisitos están además registradas en la sección 5
de la [SRS](requisitos.md).

---

## 1. El dataset condicionó el diseño más que la SRS

Antes de escribir código se analizó el archivo de IMARPE. Cinco hallazgos cambiaron decisiones
que la SRS daba por sentadas:

| Hallazgo | Consecuencia |
|---|---|
| 125,701 filas de 1970 a 2026, no las ~3,650 que estimaba la SRS | Carga por lotes y agrupado automático de series |
| El archivo viene en UTF-8 **con marca de orden de bytes** | El importador lee como `utf-8-sig`; con `utf-8` a secas la primera columna se lee mal |
| **MATARANI** dejó de medir en 2016-12-31 | Se necesita un estado «sin datos recientes» derivado del dato, no del nombre |
| Las series tienen huecos de hasta 1,127 días | «Días consecutivos» hubo que redefinirlo, y los gráficos cortan la línea |
| El diccionario oficial nombra HUANCHACO, que no está en los datos | El catálogo se deriva del CSV y los laboratorios desconocidos se rechazan |

**Lección:** leer los datos reales antes de diseñar evitó tres reescrituras.

---

## 2. La fecha de referencia sale del dato, nunca del reloj

**Decisión:** el estado vigente de cada zona se calcula contra `MAX(measured_on)` de toda la
tabla, no contra `datetime.now()`.

**Motivo:** IMARPE publica con retraso. El dato más reciente del dataset es del 2026-07-31; al
desarrollar, la fecha real era posterior. Con el reloj del servidor, las diez zonas habrían
quedado marcadas como «sin datos recientes» y el mapa entero en gris: el sistema habría
parecido roto sin estarlo.

**Efecto secundario útil:** las pruebas son deterministas sin congelar el reloj, porque el
resultado depende de los datos y no del día en que se ejecuten.

**Se descartó:** usar el reloj real y mostrar los días de atraso. Cumple el atributo de
Confiabilidad pero deja el mapa sin información.

---

## 3. La racha se cuenta por registros, no por días de calendario

**Decisión:** se cuentan mediciones consecutivas y se toleran hasta 2 días faltantes entre
ellas; a partir del tercero la racha se reinicia.

**Motivo:** la SRS decía «días consecutivos» sin definir qué pasa con los huecos, y el dataset
los tiene con frecuencia (de 1 a 6 días en los datos recientes). Con el criterio literal,
TUMBES y SAN JOSE casi nunca habrían alertado.

**Consecuencia visible y aceptada:** SAN JOSE puede aparecer cálido en el mapa sin alerta,
porque un hueco de 4 días parte su racha. El parámetro es ajustable desde la aplicación.

---

## 4. El color del mapa sale de un promedio, no de la última medición

**Decisión:** la clasificación de cada zona se calcula sobre el promedio de los últimos 5 días.

**Motivo:** un solo día atípico haría parpadear el color de la zona. Para el pescador que
consulta el estado de su caleta, una lectura estable es más útil que una que cambia a diario.

**Matiz medido:** un pico de 3 °C sobre cuatro días neutros **sí** mueve la clasificación (el
promedio queda en 0.64). Es lo deseable: una anomalía de esa magnitud no debe pasar inadvertida.
Hay una prueba que fija ese comportamiento.

---

## 5. Se implementan los dos modelos de proyección, no uno

**Decisión:** la SRS ofrecía «regresión lineal **o** media móvil ponderada». Se implementaron
ambas y se muestran juntas.

**Motivo:** proyectan cosas distintas. La regresión sigue la **tendencia**; la media ponderada
proyecta el **nivel** reciente típico. Cuando coinciden, la situación es estable; cuando
difieren, esa discrepancia es en sí una medida de incertidumbre.

**Caso real del dataset de prueba:** PISCO acumula seis registros fríos tras semanas neutras.
La regresión ya proyecta frío; la media ponderada, que promedia 30 días, todavía lee neutro.

---

## 6. Tres señales redundantes para marcar la estimación

**Decisión:** el tramo proyectado se distingue por trazo punteado, fondo sombreado y aviso en
texto, simultáneamente.

**Motivo:** la SRS exige marcarlo «explícitamente como estimación aproximada». Confundir una
estimación con una certeza es el riesgo real del requisito, así que la redundancia es
deliberada: quien no lea el aviso verá el sombreado, y quien imprima en blanco y negro verá el
punteado.

---

## 7. Identidad de las series por tres canales, con la paleta validada

**Decisión:** cada serie comparada usa color, forma de marcador y patrón de trazo distintos. La
paleta se eligió ejecutando un validador, no a ojo.

**Motivo:** distinguir series solo por color excluye a quienes no lo perciben. La primera
paleta candidata parecía correcta pero fallaba: morado y azul quedaban a ΔE 4.2 en
deuteranopía, indistinguibles. La paleta final supera, con las cuatro series simultáneas, la
separación para daltonismo (peor par ΔE 9.0), el mínimo para visión normal (ΔE 16.8) y el
contraste de 3:1 contra el fondo.

---

## 8. La línea se corta donde no hay datos

**Decisión:** el backend rellena los periodos sin medición con `null` y el gráfico no los une.

**Motivo:** unir dos puntos separados por meses dibuja una tendencia que nadie midió. HUACHO
tiene un hueco de 1,127 días que quedaría como una recta perfecta y engañosa.

**Coste asumido:** series con muchos huecos, como TUMBES, se ven fragmentadas. Eso es
información real sobre la publicación del dataset, no un defecto del gráfico.

---

## 9. La importación es parcial y tolerante

**Decisión:** las filas válidas se cargan y las inválidas se rechazan indicando línea y motivo.

**Motivo:** un dataset público rara vez es perfecto. Descartar 125,000 filas correctas por tres
erróneas dejaría el sistema sin datos.

**Un caso que apareció al probar:** una fila con el decimal escrito con coma (`1,5`) se partía
en cuatro columnas y entraba con el valor `1` en lugar de `1.5`, **sin error**. Ahora se
rechaza. Fue una prueba la que lo destapó.

---

## 10. Los laboratorios nunca se crean al importar

**Decisión:** el catálogo lo carga una migración; una fila con un laboratorio desconocido se
rechaza.

**Motivo:** el diccionario oficial nombra HUANCHACO, que no existe en los datos. Aceptarlo
crearía una zona fantasma y el mapa dejaría de tener las 10 que exige RF-04.

---

## 11. La evaluación de alertas es idempotente por diseño

**Decisión:** se usa una inserción con resolución de conflicto sobre
`(laboratorio, estado, fecha de inicio)`, en lugar de borrar y recrear.

**Motivo:** el identificador del episodio se mantiene entre evaluaciones, y de eso depende que
las notificaciones no se reenvíen. Sin tarea programada, la evaluación se dispara a mano y
puede repetirse muchas veces.

**Verificado:** reevaluar el dataset completo dos veces da 4,164 episodios ambas veces, con los
mismos identificadores.

---

## 12. Registrar los avisos y enviarlos son pasos separados

**Decisión:** la evaluación de alertas crea los avisos pendientes; un endpoint aparte dispara el
envío por correo.

**Motivo:** un servidor de correo lento o caído no debe bloquear ni hacer fallar la evaluación,
que es una operación independiente. Los envíos fallidos quedan marcados con su motivo y se
reintentan en el siguiente intento.

**Se comprobó por accidente:** durante las pruebas manuales Mailpit no estaba levantado, los
correos quedaron como fallidos, y al iniciarlo se reenviaron solos.

---

## 13. Qué se probó en cada capa, y por qué

Ni Leaflet ni Recharts pueden dibujarse en jsdom: miden un contenedor que allí tiene tamaño
cero. En lugar de forzarlos, se repartió la responsabilidad:

| Capa | Qué prueba |
|---|---|
| Unitaria pura | La lógica sin infraestructura: rachas, clasificación, agrupado, proyección, paleta, transformación de datos |
| Unitaria de componentes | El comportamiento de la interfaz, con dobles del mapa y del gráfico |
| Integración | Endpoints, persistencia y permisos, contra una base **separada** de la de desarrollo |
| Extremo a extremo | El mapa y los gráficos **reales** en un navegador, y el correo **realmente entregado** a Mailpit |

**Regla de pureza:** todo lo que está en `domain/` recibe listas y fechas explícitas. No
consulta la base ni el reloj. Por eso sus pruebas corren sin PostgreSQL y son deterministas.

---

## 14. Errores que las pruebas encontraron

Vale la pena registrarlos: son la evidencia de que el proceso de calidad sirvió para algo.

| Error | Cómo apareció |
|---|---|
| Un decimal con coma corrompía el valor en silencio | Prueba unitaria del parser |
| Una fecha repetida en el archivo abortaba toda la importación | Prueba de integración |
| El lector de texto cerraba el archivo que gestiona el servidor web | Aviso de recurso no cerrado, convertido en error por configuración |
| Dos constantes de estado HTTP obsoletas rompían respuestas | Prueba de validación de parámetros |
| Peticiones tardías sobrescribían el resultado de la actual en tres páginas | Prueba E2E al cambiar de zona |
| La navegación desbordaba en celular al crecer el menú | Prueba E2E de desbordamiento horizontal |
| Concordancia de género: «alerta cálido» | Prueba de la vista de avisos |
| **La verificación de tipos del frontend no revisaba nada** | Construcción de la imagen de producción |
| Dos procesos arrancando a la vez chocaban al crear el administrador | Despliegue de producción en local |

El penúltimo es el más significativo: el comando de verificación de tipos usaba el `tsconfig`
raíz, que no incluye archivos, así que pasaba siempre sin revisar nada. Se descubrió porque la
construcción de producción sí compila de verdad. Al corregirlo aparecieron tres errores de
tipos que llevaban semanas ocultos.

---

## 15. Decisiones de despliegue

| Decisión | Motivo |
|---|---|
| Subdominio aparte para la API | Separa los servicios; obliga a declarar el origen permitido |
| La dirección de la API se fija al **construir** | Vite escribe las variables `VITE_*` dentro del JavaScript; definirlas al arrancar no tendría efecto |
| Las migraciones corren en el arranque, con un bloqueo de PostgreSQL | Varias réplicas arrancando a la vez no deben migrar en paralelo |
| La base de producción arranca vacía | Es el mismo camino de RF-08 y sirve de verificación del despliegue |

---

## 16. Rediseño del frontend (septiembre de 2026)

El frontend funcionaba, pero con un diseño básico: una sola hoja de estilos, navegación que en
celular solo se envolvía y un mapa colorido que competía con los colores de estado. El rediseño
se hizo en cuatro fases, cada una con preguntas, maqueta aprobada, pruebas y commit propio. La
guía resultante está en [diseno.md](diseno.md).

**Alcance:** marco global (banda, navegación, menú de cuenta, pie) en todas las pantallas y
rediseño completo de Inicio. Histórico, Comparar, Próximos días, cuenta y Administración
conservan su contenido y su estilo anterior.

| Decisión | Motivo | Se descartó |
|---|---|---|
| Móvil primero, barra inferior en celular y navegación en la banda desde 768 px | El usuario principal de la SRS entra desde el celular; la barra queda al alcance del pulgar | Menú hamburguesa, que oculta la navegación |
| Solo tema claro con la identidad de la presentación | Legibilidad al sol y coherencia con lo presentado en el Hito 1 | Modo oscuro |
| Tailwind v4 **sin su reset global** y con utilidades `!important` | Tenía que convivir con la hoja antigua y con la de Leaflet sin romper las pantallas no rediseñadas | Envolver la hoja antigua en una capa CSS: la de Leaflet, fuera de capa, le habría ganado y el mapa habría tapado la navegación |
| Colores de estado derivados de la presentación, oscurecidos hasta 3:1 | WCAG 1.4.11; una prueba mide el contraste de cada color | Los colores originales, demasiado claros sobre fondo claro |
| Cada estado con color, símbolo y nombre | La situación no puede depender de distinguir colores | Solo color |
| Tarjetas en celular y tabla en escritorio, sin renderizar ambas | Un lector de pantalla leería dos veces lo mismo | Ocultar una de las dos con CSS |
| La zona elegida en la dirección (`/?zona=CALLAO`) | Sobrevive a una recarga y permite volver a la zona tras iniciar sesión | Estado solo en memoria |
| Detalle en hoja inferior modal en celular y en panel lateral en escritorio | En celular el panel quedaba lejos, bajo el mapa | Ventana modal centrada |
| Mapa base de OpenStreetMap pasado a gris claro con CSS | CARTO Positron, la opción aprobada en la maqueta, pasó a exigir clave de API | CARTO con clave expuesta en el navegador |
| Mover el mapa con dos dedos en celular | Con un dedo el mapa atrapaba el desplazamiento de la página | Mapa fijo sin zoom |
| Excepción «equivalente» de WCAG 2.5.8 para los marcadores | Con toda la costa a la vista, zonas vecinas se solapan; la misma selección está en tarjetas y tabla | Separar artificialmente marcadores cercanos |
| Carga diferida de cada pantalla | La portada pasó de 272 a 170 kB comprimidos: ya no descarga Recharts | Un único archivo de 923 kB |
| Accesibilidad con axe bloqueante en todas las pantallas | Al cerrar ninguna tenía violaciones serias; así ninguna nueva se cuela | Solo informe |

**Rendimiento medido (SRS, sección 3.3):** con la build de producción, en un celular emulado con
4G normal (9 Mbps, 40 ms) y la CPU al doble de lenta, el mapa muestra sus 10 zonas en una mediana
de **1.07 s** sobre tres cargas en frío. El límite es de 3 s.

### 16.1 Errores que el rediseño destapó

| Error | Cómo apareció |
|---|---|
| **Vite dentro de Docker servía código antiguo**: las pruebas visuales validaban una interfaz que ya no existía | La captura de una prueba fallida mostraba la cabecera anterior. En Windows los cambios de archivos no llegan al contenedor; se activó el sondeo |
| Con el sondeo, cada página tardaba más de 30 s | Medición con y sin sondeo: el almacén de pnpm (15,000 archivos) estaba dentro de la carpeta vigilada |
| **Sesiones recién iniciadas rechazadas con 401** de forma intermitente | La traza mostró el mismo token aceptado y, dos segundos después, rechazado: el reloj de la máquina virtual retrocedía y PyJWT rechaza sin tolerancia un token emitido «en el futuro». Ahora se aceptan 30 s de desajuste |
| Una carga duplicada de la configuración podía pisar lo que el administrador escribía | Prueba E2E del umbral fuera de rango |
| La tabla abierta ensanchaba toda la página en celular | Prueba E2E de desbordamiento horizontal |
| La columna de alerta quedaba recortada en escritorio por una regla antigua que impedía partir líneas | Revisión de la captura de referencia |
| «°C» quedaba solo en la línea siguiente al valor | Revisión de la captura; se usa un espacio duro |
| **La tolerancia visual relativa (0.5 %) dejaba pasar cambios reales de texto** | Al fijarla en 20 píxeles absolutos, tres capturas que habían cambiado sin avisar fallaron |
| Con la carga diferida, el menú de cuenta abierto justo después de entrar se cerraba solo | Cinco pruebas E2E: el botón de cuenta aparece antes de que la pantalla de destino termine de descargarse, y el menú se cierra al completarse el cambio de ruta. En producción el intervalo es de milisegundos; las pruebas esperan a la pantalla de destino |
| CARTO mostraba «API KEY REQUIRED» sobre el mapa | Una captura con mosaicos reales; las pruebas visuales los bloquean y no podían verlo |

**Lección:** una prueba verde solo vale si verifica lo que se cree. Dos de estos errores (el
servidor desactualizado y la tolerancia visual) hacían que las pruebas pasaran sin estar
comprobando nada.

---

## 17. Un paquete compartido para la web y la app móvil (septiembre de 2026)

La app Android (RF-09, SRS 1.7) necesita los mismos tipos de la API, las mismas reglas de
presentación y los mismos textos que la web. Copiarlos habría creado dos fuentes que se
separan con el primer cambio del backend.

| Decisión | Motivo | Se descartó |
|---|---|---|
| Workspace de pnpm en la raíz con un solo `pnpm-lock.yaml` | La web, el paquete y la app resuelven las mismas versiones; un cambio de dependencia se revisa en un solo archivo | Un lockfile por proyecto enlazado con `link:` |
| `@ola/compartido` se publica como TypeScript sin compilar, con una ruta de importación por módulo | Vite y Metro compilan TypeScript por su cuenta; sin paso de construcción no hay una versión compilada que se quede atrás | Compilar el paquete a JavaScript |
| El cliente recibe dónde guardar el token | La web usa localStorage (síncrono) y la app el almacenamiento cifrado de Android (asíncrono). Con un almacén síncrono la petición sale en el mismo instante, así que el comportamiento de la web no cambió | Un cliente distinto por plataforma |
| Los datos de ejemplo de las pruebas viven en el paquete | La web y la app prueban contra las mismas respuestas | Repetirlos en cada proyecto |
| La imagen web se construye desde la raíz, con `frontend/Dockerfile.dockerignore` | El paquete vive fuera de `frontend/`; el archivo de exclusión deja entrar solo lo que la web necesita | Copiar el paquete dentro de `frontend/` |
| Los contenedores instalan con `--filter ola-frontend...` | El workspace incluirá la app, que no se instala dentro de los contenedores de la web | Instalar todo el workspace |

Resultado de la migración: las 91 pruebas de lógica que se movieron y las 241 que quedaron en
la web siguieron en verde sin cambiar una aserción. Se añadieron 33 pruebas del contrato con la
API, que ahora cubren las dos interfaces a la vez.

---

## 18. La base de la app Android (septiembre de 2026)

Fase 1 de RF-09: el marco de la app (ícono, arranque, banda, barra inferior, cuenta y errores),
la fecha del dato leída de la API real y todo lo necesario para probarla en un celular. La
maqueta se aprobó antes de programar; la guía resultante está en [diseno.md](diseno.md),
sección 12.

| Decisión | Motivo | Se descartó |
|---|---|---|
| Expo SDK 57 con expo-router y las pantallas en `mobile/src/app/` | Rutas por archivo como la web; tocar una notificación push (fase 4) podrá abrir directamente `/zona/CALLAO` | React Navigation configurado a mano |
| Compilación local con Gradle y el Android SDK del equipo | Sin cuentas externas ni colas; el APK de pruebas y el de entrega salen del mismo lugar | EAS Build en la nube |
| Tres variantes (`desarrollo`, `e2e`, `demo`) elegidas con `APP_VARIANT` | La dirección de la API y el permiso de tráfico sin cifrar quedan escritos en el APK. Solo `demo` habla con el VPS y solo por HTTPS | Una sola compilación que elija la API al arrancar |
| El celular ve la API del equipo por el cable (`adb reverse`), en su puerto 18000 | No depende del wifi, de la IP del equipo ni del firewall de Windows. El 8000 del celular lo ocupa otra app (D-27); uno alto y poco común evita el choque | La IP de la red local |
| Maestro prueba el APK de release, no el de desarrollo | Es lo que se entrega y no depende del servidor de Metro ni de su menú | Maestro sobre el build de desarrollo |
| Un script de Node (`scripts/e2e.mjs`) rodea a Maestro | Maestro no puede cortar la red ni cambiar el tamaño de letra del celular; el script lo hace entre flujos y devuelve el celular a como estaba | Probar sin conexión y con letra grande solo a mano |
| Ese script abre un servidor local de control (`127.0.0.1:18999`) que el flujo llama con `evalScript` | El flujo sin conexión corta la API, comprueba el error, la devuelve y toca «Reintentar» sin salir de la app. Partido en dos corridas, la segunda empezaba con la app reiniciada y no probaba nada | Dos flujos separados con el corte entre ellos |
| El arranque se mide con una marca en el registro del sistema | La pantalla de estado escribe `[ola:hito] estado-visible` cuando ya muestra la fecha del dato; `scripts/medir-arranque.mjs` la busca en `logcat` y la resta del inicio que anota Android. Mide lo que ve el usuario, consulta a la API incluida | `am start -W`, que termina en el primer cuadro, antes de tener datos |
| Fuentes incrustadas al compilar con `expo-font` | El primer cuadro ya sale con la tipografía de OLA, sin descargas | Cargarlas al abrir la app |
| Ícono y arranque generados por un script desde la fuente del logotipo | Reproducibles: cambiar un color es cambiar una constante | Exportarlos a mano desde un editor |
| Paleta de identidad en `@ola/compartido`, verificada contra `tema.css` | La app no puede leer el CSS de la web; una prueba impide que las dos fuentes se separen | Copiar los colores en la app |
| Límite de letra: 130 % en la banda y 150 % en la barra | El contenido sigue el 200 % del celular; a ese tamaño las cuatro pestañas no caben | Limitar toda la app o no limitar nada |
| La hoja de cuenta en un `Modal` propio | En Android es otra ventana, así que TalkBack no sale de ella mientras está abierta | `accessibilityViewIsModal`, que solo funciona en iOS |
| Accesibilidad verificada con consultas por rol y nombre en las pruebas, más Maestro con letra al 200 % | El plugin de ESLint de accesibilidad para React Native no es compatible con ESLint 9 | Un plugin de lint sin mantenimiento |

### 18.1 Lo que costó más de lo previsto

| Problema | Qué pasó |
|---|---|
| **Testing Library 14 cambió de API** | `render`, `fireEvent` y `act` pasaron a ser asíncronos; `UNSAFE_getByType` y `toHaveAccessibilityState` desaparecieron. Las pruebas se escribieron con la API anterior y hubo que adaptarlas |
| lucide publica su versión para React Native en `.mjs` | Jest no la transforma. Las pruebas usan su versión CommonJS, idéntica, resuelta en `jest.config.js` |
| Un proceso de Jest agotaba 4 GB de memoria | No era la configuración: `useConsulta` repetía la consulta sin fin (D-24). La prueba lo encontró antes de que una pantalla lo usara |
| El primer APK no compiló | Gradle intentó descargar el NDK 27.1 que pide React Native 0.86 y la conexión se cortó; quedó una carpeta vacía. Se instaló con el nuevo CLI `android sdk`, que reemplaza a `sdkmanager` |
| **Rutas de más de 260 caracteres** en la compilación C++ | Tres capas, una tras otra. CMake no podía ejecutar sus `.bat` (295 caracteres): se acortaron los nombres de `node_modules/.pnpm` (`.npmrc`). Después, el `ninja` de CMake 3.22.1 (versión 1.10) daba los archivos por inexistentes y regeneraba sin fin, y el codegen de la app llegó a rutas de 430 caracteres. Se resolvió con el plugin `plugins/compilacion-nativa-windows.js`: CMake 3.31.6, cuyo ninja 1.12 admite rutas largas, y la compilación en `mobile/.cxx/`. Acortar más no bastaba: solo el tramo relativo del codegen mide 340 |
| La primera compilación nativa tardó 1 h 17 min | Compila el C++ de React Native, Reanimated y los módulos de Expo. El APK de pruebas se compila solo para arm64, la arquitectura del celular, y `mobile/.cxx/` se conserva entre compilaciones. El de demostración suma armeabi-v7a y su primera compilación tardó 4 h 36 min, con el equipo corriendo otras pruebas a ratos |
| El puerto 8000 del celular estaba ocupado | `adb reverse tcp:8000` falló con «Address already in use»: otra app del celular escucha ahí (D-27). La app de pruebas usa el 18000 |
| pnpm en Windows es lento y enlaza con rutas de Windows | Cada instalación tardó de 4 a 9 minutos, y los contenedores no pueden seguir sus enlaces: los scripts de la app corren en el equipo |

---

## Lo que quedó fuera

- **Rediseño de Histórico, Comparar, Próximos días, cuenta y Administración**: conservan el
  estilo anterior dentro del marco nuevo; la guía de diseño permite continuarlo.
- **SonarQube y TestLink**: evaluados y no adoptados por ahora; ver [calidad.md](calidad.md),
  sección 6.1.
- **SMS** (RF-03): la pasarela quedaba «a definir» y tiene costo por mensaje en Perú.
- **Importación programada** (RF-08): exigiría un planificador sin aportar nada demostrable.
- **Modo oscuro**: fuera del alcance que declara la SRS. La aplicación móvil, que también
  estaba fuera, entró como RF-09 en la versión 1.7.
- **Integración continua**: se decidió ejecutar las pruebas en local.
