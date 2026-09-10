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
