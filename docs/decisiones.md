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

## 19. La pestaña Mapa de la app (septiembre de 2026)

Fase 2 de RF-09: resumen, mapa con las 10 zonas, tarjetas, detalle de cada zona y lectura sin
conexión. La maqueta se aprobó antes de programar; la guía está en [diseno.md](diseno.md),
sección 12.

| Decisión | Motivo | Se descartó |
|---|---|---|
| MapLibre nativo (`@maplibre/maplibre-react-native` 11) | Mapa nativo, sin clave ni cuenta. La versión 11 ya funciona con la nueva arquitectura de React Native, que Expo 57 exige | Google Maps, que pide una clave con facturación; un WebView con el Leaflet de la web, más lento al abrir y con gestos de página web |
| Estilo Positron de OpenFreeMap | Gris claro como el mapa de la web, sin clave ni límite de uso. La política de los mosaicos de OpenStreetMap exige que una app se identifique con su propio User-Agent y publique un correo de contacto; MapLibre no deja cambiar el User-Agent con facilidad | Los mismos mosaicos de OpenStreetMap que usa la web |
| Antes de programar, un APK de prueba con las tres librerías nativas nuevas | Acción de la retrospectiva de la fase 1: la compilación es la etapa más lenta. Compiló a la primera en 18 min 30 s | Descubrir un problema de compilación con las pantallas ya escritas |
| Un proveedor de estado del mar para toda la app (`src/estado/EstadoMar.tsx`) | La pestaña Mapa y el detalle de cada zona leen lo mismo, sin pedirlo dos veces. Cada consulta lleva un número y la respuesta de una vieja se descarta (D-05) | Que cada pantalla pida el estado por su cuenta |
| Lo último que llegó de la API se guarda en AsyncStorage, con la hora | Sin conexión se ve el último estado con la fecha y la hora en que se guardó; al abrir, la app lo muestra al instante mientras pide lo nuevo | MMKV, que compila C++ propio (otra vuelta de D-26) para guardar unos 10 KB |
| NetInfo actualiza al volver la red, solo si lo que se veía era lo guardado o un error | La persona no tiene que tocar «Reintentar». El primer aviso de NetInfo al abrir no cuenta como reconexión | Actualizar con cada cambio de red, aunque los datos ya estén al día |
| El detalle es la ruta `/zona/[code]`, presentada como hoja nativa (`formSheet`) que crece según su contenido | En la fase 4, tocar una notificación abrirá directamente esa ruta. «Atrás» y deslizar hacia abajo la cierran sin código propio | Una hoja propia con `Modal`, como la de cuenta, donde la zona elegida no tiene dirección |
| Un dedo sobre el mapa desplaza la pantalla; con dos se acerca (`dragPan` desactivado) | Igual que la web en celular: el mapa está dentro de una pantalla que se desplaza y no debe atrapar el dedo | Dejar que un dedo mueva el mapa, que obliga a esquivarlo para bajar a las tarjetas |
| MapLibre dibuja los marcadores; encima, una capa de React Native pone un botón transparente de 48 dp sobre cada zona, ubicado con `project()` | MapLibre mete sus marcadores en una vista nativa que Android no expone a TalkBack ni a los toques (D-28). Los botones de la capa sí: TalkBack lee «Callao: cálido, en alerta» y el dedo abre la zona. Mientras la persona mueve el mapa, los botones se quitan y se vuelven a ubicar al terminar | Botones dentro de cada `Marker`, que se veían pero no respondían; una capa de símbolos de MapLibre, sin nombre accesible por marcador |
| La métrica de arranque espera datos de la API y el primer cuadro del mapa | Mide lo que ve la persona con datos recién llegados. Lo guardado no cuenta, y los mosaicos tampoco, porque dependen de OpenFreeMap | Contar desde lo guardado, que daría un tiempo engañosamente bajo |
| Los flujos de Maestro usan el dataset real del Docker local | Son los mismos datos que usan las E2E de la web; los flujos comprueban hechos que no cambian mientras no se reimporte el CSV | Un APK con datos fijos, que no prueba la conexión ni lo guardado |
| El modo avión se activa por adb durante un flujo | Así la app ve que la red se va y vuelve (NetInfo), mientras la API sigue llegando por el cable. El script devuelve el celular a como estaba | Probar la reconexión solo a mano |
| `scripts/compilar.mjs` rehace el proyecto nativo solo si cambió algo nativo | Guarda en `android/.huella-ola` un resumen de la variante, la configuración, las dependencias, los plugins y los recursos. Si coincide, Gradle solo recompila el JavaScript: 3 min 24 s en lugar de 47 min. `--limpio` fuerza lo de antes | Rehacer `android/` en cada compilación, como en la fase 1 |

### 19.1 Lo que costó más de lo previsto

| Problema | Qué pasó |
|---|---|
| **Los marcadores no respondían** (D-28) | En Jest cada marcador era un botón con nombre, porque las pruebas simulan el mapa. En el celular se veían, pero Maestro no los encontraba. El volcado de la jerarquía (`uiautomator dump`) mostró que no estaban en el árbol de accesibilidad. En el código de MapLibre, cada marcador va dentro de un contenedor nativo creado sin medidas: para Android mide 0 × 0, así que el dibujo se ve pero el botón no existe para TalkBack ni para el dedo |
| Cuatro flujos de Maestro fallaban sin que la app fallara (D-29) | La pantalla Mapa es cinco veces más larga que la de la fase 1, y `scrollUntilVisible` se rendía a los 20 s. Un arrastre y un doble toque, dados en coordenadas de la pantalla, caían fuera del mapa. Y el aviso «Usa dos dedos para mover el mapa» dura 1.5 s, menos de lo que Maestro tarda en revisar la pantalla tras un gesto: esa comprobación quedó en Jest, con una captura en el celular como evidencia |
| La compilación completa tardó 46 min 54 s | El `prebuild --clean` borra `android/` y, con él, lo que Gradle ya había compilado. Por eso la huella del proyecto nativo |

---

## 20. Cuenta, recuperación de contraseña y zonas en la app (septiembre de 2026)

Fase 3 de RF-09 y cambio de RF-07 (SRS 1.8): entrar, crear la cuenta, recuperar la contraseña y
elegir zonas desde la app. La maqueta se aprobó tal cual; la guía está en [diseno.md](diseno.md),
sección 12.2. El plan decía que el backend no cambiaba en esta fase. Cambió, con aprobación del
PO, porque sin recuperación una sesión de 30 días termina en una cuenta perdida.

| Decisión | Motivo | Se descartó |
|---|---|---|
| Recuperar la contraseña con un código de 6 dígitos enviado por correo, en el backend, la web y la app | El código se escribe en la misma pantalla donde se pidió, en la web o en la app. No hace falta abrir un enlace en el navegador ni que la app reciba enlaces | Un enlace con un token, que en el celular abre el navegador y no la app |
| El código vale 15 minutos, admite 5 intentos y se puede pedir uno por minuto. Cada código nuevo anula el anterior | Con 5 intentos, adivinar un código tiene una probabilidad de 5 en un millón. El minuto de espera evita llenar el buzón de alguien a pedido de un tercero | Sin límite de intentos; un bloqueo de la cuenta, que un tercero podría provocar a propósito |
| Se guarda el HMAC-SHA256 del código, con el secreto del servidor y el id del usuario, y se compara en tiempo constante | 6 dígitos son un millón de combinaciones: con un hash simple, quien copie la tabla los prueba todos en segundos. Sin el secreto no puede | Guardar el código tal cual; bcrypt, lento de más para un código que vence en 15 minutos |
| Pedir un código responde siempre lo mismo, exista o no la cuenta, y aunque el correo no salga | La respuesta no revela qué correos están registrados. Si el correo falla, queda en el registro del servidor | Decir «ese correo no tiene cuenta», que ayuda a la persona pero también a quien busca cuentas |
| Cambiar la contraseña invalida los tokens emitidos antes (`password_changed_at` frente al `iat` del token) y deja la sesión iniciada | Si alguien más tenía la sesión abierta, la pierde. No hace falta una tabla de sesiones: el token sigue sin estado y basta una columna | Una lista de tokens revocados; tokens de refresco |
| Sesión de 30 días solo en la app (`mantener_sesion`); en la web sigue de 60 minutos | En el celular, la persona no debería escribir la contraseña cada vez que abre la app. La web puede abrirse en una computadora compartida | Sesión larga en los dos; tokens de refresco con rotación, más piezas para el mismo resultado |
| El token y los datos del usuario van en `expo-secure-store`, cifrados con el Keystore de Android | AsyncStorage guarda texto plano, legible en una copia de seguridad. Se configuró que la copia de seguridad de Android no incluya lo cifrado, que en otro celular no se podría descifrar | AsyncStorage |
| Al abrir, la app muestra la sesión guardada y la confirma con `/auth/me`. Sin conexión la conserva; con un 401 la cierra sin avisar | La persona abrió la app, no hizo nada todavía: un aviso de «sesión terminada» a esa altura confunde. Sin red no hay forma de saber si el token sigue valiendo | Pedir la contraseña cada vez que no hay red |
| Un 401 a mitad de uso cierra la sesión, abre Entrar con «Tu sesión terminó. Vuelve a entrar.» y, al entrar, devuelve a la pantalla donde estaba | El cliente compartido avisa con `alNoAutorizado`, y un vigía del marco abre Entrar. La persona no pierde el lugar | Mandar al mapa; mostrar el error de la API tal cual |
| Salir borra el token, el usuario y las zonas seguidas, pero no el estado del mar guardado | El estado del mar es público; borrarlo dejaría la app vacía sin conexión | Borrar todo lo guardado |
| Entrar, Crear cuenta, Recuperar y Mis zonas son pantallas completas con «atrás» | Con el teclado abierto, una hoja deja poco espacio para ver el campo | Hojas como la de cuenta |
| Mis zonas es la lista de las 10 con un interruptor; desde ahí también se sigue Matarani, que no tiene marcador en el mapa. Toda la fila, de 64 dp, es el interruptor (D-33) | Una pantalla sirve para elegir y para ver lo que ya se sigue. El detalle de la zona tiene además su propio «Recibir avisos» | Una lista solo de las seguidas, con un botón para añadir |
| Sin autocompletado de Android en los campos: `autoComplete="off"` y un módulo nativo propio cancela la sesión de autocompletado al enfocar cada campo y al dejar el formulario (`mobile/modules/autocompletado/`) | Se decidió así en la ronda de preguntas de la fase 3. Desde Android 14 el sistema pide autocompletar también los campos marcados como no importantes, así que apagarlo en cada campo no bastó (D-32). Sin sesión abierta, el servicio del celular no tiene nada que ofrecer guardar | El autocompletado de Google; aceptar la ventana de Samsung Pass y cerrarla en cada flujo de Maestro, que habría escondido el defecto |
| Los mensajes del backend se corrigieron con tildes (D-30) | La app y la web muestran el `detail` de la API tal cual: corregirlo en cada cliente sería repetirlo | Traducir los mensajes en cada cliente |
| La base de pruebas se borra y se crea de nuevo en cada corrida, y una prueba compara las migraciones con los modelos (D-31) | `create_all` no toca una tabla que ya existe: la columna nueva nunca llegaba a la base de pruebas. La comparación con Alembic sobre una base vacía avisa si un modelo cambia sin su migración | Confiar en que cada quien borre la base a mano |
| Los flujos de Maestro leen el código de recuperación en Mailpit con un script | El flujo prueba lo mismo que haría la persona: pedir el código, leer el correo y escribirlo | Un código fijo solo para pruebas en el backend |

### 20.1 Lo que costó más de lo previsto

| Problema | Qué pasó |
|---|---|
| Un formateo sin la configuración del proyecto | Se corrió Prettier con sus valores por defecto sobre `mobile/src` y `mobile/pruebas`, y reescribió 58 archivos con comillas dobles y punto y coma, incluidos los de las fases 1 y 2. Se descartó con Git y los archivos de la fase se escribieron de nuevo con el estilo del proyecto. El repositorio no tiene configuración de Prettier: el estilo se mantiene a mano y lo vigila la revisión |
| La base de pruebas no tenía la columna nueva (D-31) | Las pruebas de integración fallaban porque a la tabla de usuarios le faltaba la columna nueva. Parecía un error de la migración, pero la migración estaba bien: la base de pruebas se había creado en una fase anterior y `create_all` no la actualizaba |
| Samsung Pass pedía guardar la contraseña (D-32) | En Jest los campos tenían el autocompletado apagado y todo pasaba. En el celular, cuatro de cinco flujos de cuenta fallaron: después de entrar, la ventana «Save sign-in info to Samsung Pass?» tapaba la app y seguía abierta en los flujos siguientes. La configuración del celular (`device_config list autofill`) explicó por qué: `trigger_fill_request_on_unimportant_view=true`. React Native no ofrece cancelar la sesión, así que hizo falta un módulo nativo, y con él rehacer el proyecto Android. Cancelar al enfocar arregló cuatro flujos; el quinto, que entra desde el detalle de una zona, seguía mostrando la ventana, y se añadió cancelar también al dejar el formulario |
| El interruptor de Mis zonas medía 27 dp (D-33) | Las pruebas de Jest lo encontraban por rol y nombre, y pasaban. La revisión en el celular del árbol de accesibilidad, la acción que había dejado la fase 2, mostró que el `Switch` de Android mide 47 × 27 dp y era lo único que respondía al dedo. Ahora la fila entera es el interruptor y el `Switch` queda como dibujo, oculto para TalkBack: la versión comprimida del árbol, la que usa TalkBack, muestra un interruptor por zona y ninguno más |
| Volver después de entrar | `dismissAll` fallaba cuando Entrar era la primera pantalla de la pila, como en las pruebas que abren la app directamente en Entrar. `dismissTo('/')` vuelve al mapa, o lo abre si no estaba |

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
