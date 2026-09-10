import { expect, test, type Page, type APIRequestContext } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@ola.pe'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000'
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://mailpit:8025'

const CLAVE = 'miclave123'

/** Cada corrida usa un correo nuevo, así no interfiere con datos existentes. */
const correoUnico = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ejemplo.pe`

async function registrarse(page: Page, email: string) {
  await page.goto('/registro')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Registrarme' }).click()
  await expect(page.getByTestId('sesion-actual')).toContainText(email)
}

async function seguirZona(page: Page, nombre: string) {
  await page.goto('/mis-zonas')
  const fila = page.getByTestId(`zona-${nombre}`)
  await fila.getByRole('button', { name: 'Seguir' }).click()
  await expect(page.getByTestId(`siguiendo-${nombre}`)).toBeVisible()
}

async function tokenAdmin(request: APIRequestContext): Promise<string> {
  const r = await request.post(`${API_URL}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  return (await r.json()).access_token
}

test.describe('Fase 7 — suscripciones (RF-07)', () => {
  test('sin sesión no se puede elegir zonas de interés', async ({ page }) => {
    await page.goto('/mis-zonas')
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('un usuario elige y abandona zonas', async ({ page }) => {
    await registrarse(page, correoUnico())
    await page.goto('/mis-zonas')
    await expect(page.getByTestId('sin-suscripciones')).toBeVisible()

    await seguirZona(page, 'CALLAO')
    await seguirZona(page, 'PISCO')
    await expect(page.getByTestId('sin-suscripciones')).toHaveCount(0)

    await page.getByTestId('zona-CALLAO').getByRole('button', { name: 'Dejar de seguir' }).click()
    await expect(page.getByTestId('siguiendo-CALLAO')).toHaveCount(0)
    await expect(page.getByTestId('siguiendo-PISCO')).toBeVisible()
  })

  test('las suscripciones sobreviven a una recarga', async ({ page }) => {
    await registrarse(page, correoUnico())
    await seguirZona(page, 'ILO')

    await page.reload()
    await expect(page.getByTestId('siguiendo-ILO')).toBeVisible()
  })
})

test.describe('Fase 7 — avisos por correo (RF-03)', () => {
  test.skip(ADMIN_PASSWORD === '', 'E2E_ADMIN_PASSWORD no está definida')

  test('el flujo completo llega hasta el correo entregado', async ({ page, request }) => {
    const email = correoUnico()
    await registrarse(page, email)
    // CALLAO tiene una alerta vigente, así que suscribirse ya genera avisos.
    await seguirZona(page, 'CALLAO')

    // El aviso queda dentro de la aplicación desde el primer momento.
    await page.goto('/avisos')
    await expect(page.getByTestId('lista-avisos')).toContainText('Callao')
    await expect(page.getByTestId('sin-leer')).toBeVisible()

    // El correo no sale hasta que un administrador dispara el envío.
    const token = await tokenAdmin(request)
    const envio = await request.post(`${API_URL}/api/notifications/send`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(envio.status()).toBe(200)

    // Se comprueba contra Mailpit, no contra un simulacro: esto es lo que
    // hace que la prueba sea de extremo a extremo de verdad.
    const buzon = await request.get(`${MAILPIT_URL}/api/v1/search`, {
      params: { query: `to:${email}` },
    })
    const mensajes = (await buzon.json()).messages
    expect(mensajes.length).toBeGreaterThan(0)
    expect(mensajes[0].Subject).toContain('Callao')
  })

  test('el correo se escribe en español y sin jerga técnica', async ({ page, request }) => {
    const email = correoUnico()
    await registrarse(page, email)
    await seguirZona(page, 'CALLAO')

    const token = await tokenAdmin(request)
    await request.post(`${API_URL}/api/notifications/send`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const buzon = await request.get(`${MAILPIT_URL}/api/v1/search`, {
      params: { query: `to:${email}` },
    })
    const id = (await buzon.json()).messages[0].ID
    const cuerpo = (await (await request.get(`${MAILPIT_URL}/api/v1/message/${id}`)).json()).Text

    expect(cuerpo).toContain('entró en alerta')
    expect(cuerpo).toContain('IMARPE')
    expect(cuerpo).toContain('ENFEN')
    expect(cuerpo).toContain('darte de baja')
    // RF-03 se redujo a correo y avisos en la aplicación.
    expect(cuerpo).not.toContain('SMS')
  })

  test('el aviso se puede marcar como leído', async ({ page }) => {
    await registrarse(page, correoUnico())
    await seguirZona(page, 'CALLAO')

    await page.goto('/avisos')
    await expect(page.getByTestId('sin-leer')).toBeVisible()

    await page.getByRole('button', { name: 'Marcar todos como leídos' }).click()
    await expect(page.getByTestId('sin-leer')).toHaveCount(0)
  })

  test('cada usuario ve solo sus propios avisos', async ({ page, browser }) => {
    await registrarse(page, correoUnico())
    await seguirZona(page, 'CALLAO')
    await page.goto('/avisos')
    await expect(page.getByTestId('lista-avisos')).toContainText('Callao')

    const otro = await browser.newContext()
    const otraPagina = await otro.newPage()
    await registrarse(otraPagina, correoUnico())
    await otraPagina.goto('/avisos')
    await expect(otraPagina.getByTestId('sin-avisos')).toBeVisible()
    await otro.close()
  })

  test('solo el administrador ve el panel de envío', async ({ page }) => {
    await registrarse(page, correoUnico())
    await page.goto('/admin')
    await expect(page.getByText('requiere permisos de administrador')).toBeVisible()
  })
})
