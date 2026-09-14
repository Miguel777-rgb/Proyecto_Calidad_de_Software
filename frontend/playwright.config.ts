import { defineConfig, devices } from '@playwright/test'

// Las E2E corren contra el stack ya levantado con `docker compose up`.
// Ajusta E2E_BASE_URL si cambiaste WEB_PORT en el archivo .env.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

// captura.spec.ts no es una prueba: genera imagenes para el informe y se
// excluye de la suite. Para ejecutarla a proposito:
//   E2E_CAPTURAS=1 pnpm exec playwright test captura.spec.ts
//
// rendimiento.spec.ts compila y sirve la build de produccion, asi que tampoco
// corre con la suite normal. Se ejecuta con `pnpm test:rendimiento`.
const RENDIMIENTO = Boolean(process.env.E2E_RENDIMIENTO)
const CAPTURAS = [
  ...(process.env.E2E_CAPTURAS ? [] : ['**/captura.spec.ts']),
  '**/rendimiento.spec.ts',
]
const PUERTO_PREVIEW = 4173

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
    // Tolerancia absoluta y minima: las referencias se generan en el mismo
    // contenedor donde se comparan, asi que el dibujo es determinista. Una
    // tolerancia relativa (0.5 %) dejaba pasar cambios reales: en una captura
    // de 300 x 500 px, que «°C» saltara de linea cambiaba menos de 750 pixeles.
    toHaveScreenshot: { maxDiffPixels: 20, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Solo para la medicion de rendimiento: la build de produccion servida con
  // `vite preview`, que reutiliza el proxy de /api hacia el servicio `api`.
  webServer: RENDIMIENTO
    ? {
        command: `pnpm build && pnpm exec vite preview --port ${PUERTO_PREVIEW} --strictPort`,
        url: `http://localhost:${PUERTO_PREVIEW}`,
        timeout: 240_000,
        reuseExistingServer: false,
      }
    : undefined,
  projects: RENDIMIENTO
    ? [
        {
          name: 'rendimiento',
          testMatch: '**/rendimiento.spec.ts',
          // Sin esto heredaria la exclusion global de rendimiento.spec.ts.
          testIgnore: [],
          workers: 1,
          use: { ...devices['Pixel 7'], baseURL: `http://localhost:${PUERTO_PREVIEW}` },
        },
      ]
    : [
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
