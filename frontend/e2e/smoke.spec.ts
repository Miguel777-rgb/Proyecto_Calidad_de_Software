import { expect, test } from '@playwright/test'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000'

test.describe('Fase 0 — andamiaje', () => {
  test('la API responde en el endpoint de salud', async ({ request }) => {
    const respuesta = await request.get(`${API_URL}/api/health/ready`)
    expect(respuesta.status()).toBe(200)
    expect(await respuesta.json()).toEqual({ status: 'ok', database: 'ok' })
  })

  test('la aplicacion carga y muestra su cabecera', async ({ page }) => {
    await page.goto('/entrar')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('OLA')
  })

  test('la atribucion a IMARPE es visible, como exige la SRS', async ({ page }) => {
    await page.goto('/entrar')
    await expect(page.getByTestId('atribucion')).toContainText('IMARPE')
  })
})
