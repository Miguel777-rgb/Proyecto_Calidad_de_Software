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

## Lo que quedó fuera

- **SMS** (RF-03): la pasarela quedaba «a definir» y tiene costo por mensaje en Perú.
- **Importación programada** (RF-08): exigiría un planificador sin aportar nada demostrable.
- **Modo oscuro** y **aplicación móvil nativa**: fuera del alcance que declara la SRS.
- **Integración continua**: se decidió ejecutar las pruebas en local.
