import { defineConfig, devices } from '@playwright/test'

// Las E2E corren contra el stack ya levantado con `docker compose up`.
// Ajusta E2E_BASE_URL si cambiaste WEB_PORT en el archivo .env.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  // captura.spec.ts no es una prueba: genera imagenes para el informe.
  // Se ejecuta a proposito con: pnpm exec playwright test captura.spec.ts
  testIgnore: '**/captura.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
