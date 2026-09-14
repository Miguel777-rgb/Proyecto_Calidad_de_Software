import { defineConfig, devices } from '@playwright/test'

// Las E2E corren contra el stack ya levantado con `docker compose up`.
// Ajusta E2E_BASE_URL si cambiaste WEB_PORT en el archivo .env.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

// captura.spec.ts no es una prueba: genera imagenes para el informe y se
// excluye de la suite. Para ejecutarla a proposito:
//   E2E_CAPTURAS=1 pnpm exec playwright test captura.spec.ts
const CAPTURAS = process.env.E2E_CAPTURAS ? [] : ['**/captura.spec.ts']

// Specs que cargan el backend: reevaluar alertas recorre todo el dataset (con
// otras pruebas en paralelo llego a superar los 30 s de limite) e importar
// escribe filas que otras pruebas podrian leer. Corren aparte, de una en una
// y cuando el resto ya termino.
const PESADAS = ['**/estado.spec.ts', '**/importacion.spec.ts', '**/notificaciones.spec.ts']

export default defineConfig({
  testDir: './e2e',
  testIgnore: CAPTURAS,
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  expect: {
    // Tolerancia minima: las referencias se generan en el mismo contenedor
    // donde se comparan, asi que solo absorbe el suavizado de bordes.
    toHaveScreenshot: { maxDiffPixelRatio: 0.005, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [...CAPTURAS, ...PESADAS],
    },
    // Celular emulado: pantalla de 412 px, tactil y con agente movil. Solo
    // ejecuta las pruebas etiquetadas @movil, que son las que dependen del
    // tamano de pantalla; el resto ya se cubre en escritorio.
    {
      name: 'movil',
      use: { ...devices['Pixel 7'] },
      grep: /@movil/,
      testIgnore: [...CAPTURAS, ...PESADAS],
    },
    {
      name: 'backend-en-serie',
      use: { ...devices['Desktop Chrome'] },
      testMatch: PESADAS,
      workers: 1,
      dependencies: ['chromium', 'movil'],
    },
  ],
})
