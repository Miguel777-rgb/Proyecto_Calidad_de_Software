import { chromium, request, type FullConfig } from '@playwright/test'

/**
 * Calienta el servidor de desarrollo antes de que corran las pruebas.
 *
 * Vite compila cada modulo la primera vez que se pide. Sin este paso, varias
 * pruebas en paralelo golpean rutas frias a la vez y algunas agotan su tiempo
 * de espera, dando fallos que no corresponden a errores reales.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
  const apiURL = process.env.E2E_API_URL ?? 'http://localhost:8000'

  const api = await request.newContext()
  await api.get(`${apiURL}/api/health/ready`)
  await api.dispose()

  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const ruta of ['/entrar', '/registro']) {
    await page.goto(`${baseURL}${ruta}`, { waitUntil: 'networkidle' })
  }
  await browser.close()

  void config
}

export default globalSetup
