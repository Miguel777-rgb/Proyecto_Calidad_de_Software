# Frontend de OLA

Aplicación web responsiva en **React + Vite + TypeScript**. Muestra el mapa de estado térmico,
los históricos por laboratorio, la comparación entre zonas y las proyecciones.

## Estructura

```text
src/
├── api/          Cliente HTTP tipado contra la API
├── components/   Componentes reutilizables
├── pages/        Una carpeta por vista
├── i18n/         Todos los literales visibles, en español
└── estilos.css
e2e/              Pruebas de extremo a extremo con Playwright
```

El código se escribe en inglés y **todo el texto visible vive en `src/i18n/textos.ts`**, para
poder revisarlo de una sola pasada.

## Comandos

```bash
docker compose exec web pnpm test          # pruebas unitarias (Vitest)
docker compose exec web pnpm typecheck     # tipos
docker compose exec web pnpm lint          # linter
docker compose exec web pnpm build         # compila a dist/

docker compose --profile e2e run --rm e2e  # pruebas E2E (Playwright)
```

## Versión de Playwright

La versión de `@playwright/test` en `package.json` está fijada **sin `^`** y debe coincidir
exactamente con la etiqueta de la imagen `mcr.microsoft.com/playwright` en `compose.yml`. Si
se actualiza una, hay que actualizar la otra: de lo contrario el navegador no se encuentra.

## Llamadas a la API

El cliente usa la ruta relativa `/api`. En desarrollo la resuelve el proxy de Vite y en
producción la resuelve Nginx, así que el navegador siempre habla con su mismo origen.

## Mapa interactivo (RF-04)

- **Leaflet** con `CircleMarker`, no marcadores por defecto: se colorean según el estado y se
  evita el fallo conocido de los iconos de Leaflet al empaquetar con Vite.
- Fondo cartográfico de **OpenStreetMap**. Su atribución es obligatoria por licencia y se
  muestra dentro del mapa, junto a la de IMARPE que exige la SRS.
- El encuadre se calcula a partir de las coordenadas de las zonas, así que se ajusta solo si el
  catálogo cambia.
- Las zonas con alerta vigente se dibujan con un radio mayor, para que destaquen sin depender
  únicamente del color.
- Los colores de estado viven **solo** en `src/components/mapa/paleta.ts`. El mapa, la leyenda
  y la tabla los toman de ahí para que no puedan desincronizarse.
- En pantalla de celular el panel de detalle se coloca **debajo** del mapa, no encima.
- La **tabla** bajo el mapa es la alternativa accesible: un mapa no es utilizable con lector de
  pantalla ni con teclado.

### Pruebas del mapa

Leaflet no puede montarse en jsdom porque mide el contenedor real y usa APIs de dibujo que no
existen fuera del navegador. Por eso:

- Las pruebas unitarias usan el doble de `src/test-mocks/react-leaflet.tsx`, que conserva lo
  único que hace falta comprobar: un círculo por zona y el aviso al pulsarlo.
- La lógica pura (paleta y cálculo del encuadre) se prueba directamente, sin doble.
- **El mapa real se valida en las E2E**, que sí corren en un navegador.

### Capturas para el informe

`e2e/captura.spec.ts` genera imágenes en `frontend/capturas/`. No forma parte de la suite; se
ejecuta a propósito:

```bash
docker compose --profile e2e run --rm e2e sh -c "pnpm exec playwright test captura.spec.ts"
```

## Al añadir una dependencia

El servicio `web` monta `node_modules` en un **volumen de Docker**, que tiene prioridad sobre
el contenido de la imagen. Reconstruir la imagen no basta: el volumen conserva las
dependencias de la primera instalación y el paquete nuevo no aparece, con errores de
resolución difíciles de interpretar. Hay que recrearlo:

```bash
docker compose stop web && docker compose rm -f web
docker volume rm ola_node_modules
docker compose up -d --build web
```

## Gráficos (RF-05, RF-06)

Se usa **Recharts**. Las decisiones de diseño no son estéticas: cada una responde a un
requisito o a un rasgo real del dataset.

- **Agrupado automático.** El usuario elige el rango, no la resolución: pedir dato diario de
  56 años son más de 20,000 puntos. El backend agrupa en PostgreSQL (diario hasta un año,
  semanal hasta cinco, mensual más allá) y nunca envía más de unos cientos de puntos.
- **La línea se corta en los huecos.** El backend rellena los periodos sin medición con `null`
  y el gráfico usa `connectNulls={false}`. Unir dos puntos separados por meses dibujaría una
  tendencia que nadie midió: HUACHO tiene un hueco de 1,127 días que quedaría como una recta.
- **Eje vertical anclado en cero**, sin forzar la simetría. La anomalía es una desviación y el
  signo distingue cálido de frío, pero reservar espacio negativo cuando todos los valores son
  positivos aplastaría la señal en media gráfica.
- **Tres canales redundantes por serie**: color, forma de marcador y patrón de trazo. Así se
  distinguen sin depender del color. Los marcadores se dibujan cada N puntos, no en todos,
  para no saturar el gráfico.
- **La paleta está validada**, no elegida a ojo. Con las cuatro series simultáneas supera la
  separación para daltonismo (peor par ΔE 9.0 en deuteranopía), el mínimo de distinción para
  visión normal (ΔE 16.8) y el contraste de 3:1 contra el fondo.
- **Tabla alternativa** bajo cada gráfico: un SVG con líneas no es utilizable con lector de
  pantalla.

Como con Leaflet, Recharts no puede dibujarse en jsdom porque mide un contenedor de tamaño
cero. Las pruebas unitarias usan el doble de `src/test-mocks/GraficoSerie.tsx`, la lógica pura
se prueba directamente en `datos.test.ts` y **el gráfico real se valida en las E2E**.
