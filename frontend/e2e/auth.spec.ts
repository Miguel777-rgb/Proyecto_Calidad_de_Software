import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@ola.pe'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''

/**
 * La base de desarrollo es persistente, asi que cada ejecucion usa un correo
 * nuevo en lugar de vaciar tablas. Asi las pruebas son repetibles sin
 * destruir los datos que el equipo tenga importados.
 */
const correoUnico = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ejemplo.pe`

async function registrarse(page: Page, email: string, clave = 'miclave123') {
  await page.goto('/registro')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(clave)
  await page.getByRole('button', { name: 'Registrarme' }).click()
}

async function entrar(page: Page, email: string, clave: string) {
  await page.goto('/entrar')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(clave)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test.describe('Fase 1 — autenticación (RF-07)', () => {
  test('la página principal se puede ver sin iniciar sesión', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Estado térmico del litoral' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('un usuario nuevo se registra y queda con la sesión iniciada', async ({ page }) => {
    const email = correoUnico()
    await registrarse(page, email)

    await expect(page.getByTestId('sesion-actual')).toContainText(email)
    await expect(page.getByTestId('sesion-actual')).toContainText('Usuario')
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
  })

  test('la sesión sobrevive a una recarga de la página', async ({ page }) => {
    const email = correoUnico()
    await registrarse(page, email)
    await expect(page.getByTestId('sesion-actual')).toContainText(email)

    await page.reload()
    await expect(page.getByTestId('sesion-actual')).toContainText(email)
  })

  test('al cerrar sesión se pierde la sesión pero no el acceso público', async ({ page }) => {
    await registrarse(page, correoUnico())
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    await expect(page.getByTestId('sesion-actual')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
    // El estado de las zonas sigue siendo visible.
    await expect(page.getByRole('heading', { name: 'Estado térmico del litoral' })).toBeVisible()
  })

  test('un correo ya registrado no puede volver a registrarse', async ({ page }) => {
    const email = correoUnico()
    await registrarse(page, email)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    await registrarse(page, email)
    await expect(page.getByRole('alert')).toContainText('Ya existe una cuenta')
  })

  test('una contraseña corta se rechaza con un mensaje en español', async ({ page }) => {
    await registrarse(page, correoUnico(), '1234')
    await expect(page.getByRole('alert')).toContainText('al menos 8 caracteres')
  })

  test('una contraseña incorrecta no inicia sesión', async ({ page }) => {
    const email = correoUnico()
    await registrarse(page, email)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    await entrar(page, email, 'claveequivocada')
    await expect(page.getByRole('alert')).toContainText('incorrectos')
  })

  test('el usuario puede volver a entrar con sus credenciales', async ({ page }) => {
    const email = correoUnico()
    await registrarse(page, email)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    await entrar(page, email, 'miclave123')
    await expect(page.getByTestId('sesion-actual')).toContainText(email)
  })

  test('el administrador creado al arrancar puede iniciar sesión', async ({ page }) => {
    test.skip(ADMIN_PASSWORD === '', 'E2E_ADMIN_PASSWORD no está definida')

    await entrar(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page.getByTestId('sesion-actual')).toContainText(ADMIN_EMAIL)
    await expect(page.getByTestId('sesion-actual')).toContainText('Administrador')
  })
})
