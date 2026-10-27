import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { cerrarSesion, esperarSesion } from './utilidades'

/**
 * Recuperar la contrasena de punta a punta (RF-07): el codigo se lee del
 * correo que entrega Mailpit, como lo leeria la persona.
 */
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://mailpit:8025'
const correoUnico = () => `e2e-rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ejemplo.pe`

async function registrarse(page: Page, email: string, clave = 'miclave123') {
  await page.goto('/registro')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(clave)
  await page.getByRole('button', { name: 'Registrarme' }).click()
  await esperarSesion(page, email)
}

async function correosPara(request: APIRequestContext, email: string) {
  const buzon = await request.get(`${MAILPIT_URL}/api/v1/search`, {
    params: { query: `to:${email}` },
  })
  return (await buzon.json()).messages as { ID: string; Subject: string }[]
}

async function codigoDelCorreo(request: APIRequestContext, email: string): Promise<string> {
  await expect.poll(async () => (await correosPara(request, email)).length).toBeGreaterThan(0)
  const [mensaje] = await correosPara(request, email)
  expect(mensaje.Subject).toBe('Tu código para cambiar la contraseña de OLA')
  const texto = (await (await request.get(`${MAILPIT_URL}/api/v1/message/${mensaje.ID}`)).json())
    .Text as string
  const codigo = texto.match(/\b(\d{6})\b/)?.[1]
  expect(codigo).toBeDefined()
  return codigo!
}

test.describe('Recuperar la contraseña (RF-07)', () => {
  test('con el código del correo cambia la contraseña y deja la sesión iniciada', async ({
    page,
    request,
  }) => {
    const email = correoUnico()
    await registrarse(page, email)
    await cerrarSesion(page)

    await page.goto('/entrar')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click()
    // El correo escrito en Entrar llega ya puesto.
    await expect(page.getByLabel('Correo electrónico')).toHaveValue(email)
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByRole('status')).toContainText(`Si ${email} tiene cuenta`)

    await page.getByLabel('Código de 6 dígitos').fill(await codigoDelCorreo(request, email))
    await page.getByLabel('Contraseña nueva').fill('una clave nueva')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await esperarSesion(page, email)

    await cerrarSesion(page)
    await page.goto('/entrar')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña').fill('miclave123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos.')

    await page.getByLabel('Contraseña').fill('una clave nueva')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await esperarSesion(page, email)
  })

  test('un correo sin cuenta recibe la misma respuesta y ningún correo', async ({
    page,
    request,
  }) => {
    const email = correoUnico()
    await page.goto('/recuperar')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByRole('button', { name: 'Enviar código' }).click()

    await expect(page.getByRole('status')).toContainText(`Si ${email} tiene cuenta`)
    expect(await correosPara(request, email)).toHaveLength(0)
  })

  test('un código equivocado se rechaza con un mensaje claro', async ({ page, request }) => {
    const email = correoUnico()
    await registrarse(page, email)
    await cerrarSesion(page)
    await page.goto('/recuperar')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByRole('button', { name: 'Enviar código' }).click()
    const codigo = await codigoDelCorreo(request, email)
    const equivocado = String((Number(codigo) + 1) % 1_000_000).padStart(6, '0')

    await page.getByLabel('Código de 6 dígitos').fill(equivocado)
    await page.getByLabel('Contraseña nueva').fill('una clave nueva')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()

    await expect(page.getByRole('alert')).toHaveText('El código no es válido o ya venció.')
  })
})
