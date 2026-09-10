import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@ola.pe'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000'

async function entrarComoAdmin(page: Page) {
  await page.goto('/entrar')
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByTestId('sesion-actual')).toContainText('Administrador')
}

test.describe('Fase 3 — estado térmico y rachas (RF-01)', () => {
  test('el estado de las zonas es público', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Estado térmico del litoral' })).toBeVisible()
  })

  test('la API de estado devuelve las 10 zonas y una fecha de referencia', async ({ request }) => {
    const respuesta = await request.get(`${API_URL}/api/status`)
    expect(respuesta.status()).toBe(200)

    const datos = await respuesta.json()
    expect(datos.zones).toHaveLength(10)
    // La referencia sale del dato, no del reloj: nunca es la fecha de hoy
    // salvo que IMARPE haya publicado justo hoy.
    expect(datos.reference_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('la fecha del dato se muestra siempre, como exige la SRS', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('fecha-referencia')).toContainText('Datos actualizados al')
  })

  test('la leyenda explica los cuatro estados', async ({ page }) => {
    await page.goto('/')
    const leyenda = page.getByTestId('leyenda')
    for (const estado of ['Cálido', 'Neutro', 'Frío', 'Sin datos recientes']) {
      await expect(leyenda).toContainText(estado)
    }
  })

  test('la zona descontinuada aparece como sin datos recientes', async ({ page }) => {
    await page.goto('/')
    // MATARANI dejó de medir en 2016. No se la nombra en el código: la
    // obsolescencia se deduce de la fecha de su último dato.
    await expect(page.getByTestId('situacion-MATARANI')).toHaveText('Sin datos recientes')
  })

  test('una zona sin datos recientes nunca muestra alerta', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('zona-MATARANI')).toBeVisible()
    await expect(page.getByTestId('alerta-MATARANI')).toHaveCount(0)
  })

  test('la atribución a IMARPE acompaña al estado', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('atribucion')).toContainText('IMARPE')
  })
})

test.describe('Fase 3 — parámetros de detección', () => {
  test.skip(ADMIN_PASSWORD === '', 'E2E_ADMIN_PASSWORD no está definida')

  test('un usuario sin sesión no llega a los parámetros', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('el administrador ve los parámetros vigentes', async ({ page }) => {
    await entrarComoAdmin(page)
    await page.goto('/admin')

    await expect(page.getByLabel('Umbral de anomalía (°C)')).toHaveValue(/\d/)
    await expect(page.getByLabel('Registros seguidos para alertar')).toHaveValue(/\d/)
  })

  test('se advierte que guardar no recalcula las alertas', async ({ page }) => {
    await entrarComoAdmin(page)
    await page.goto('/admin')
    await expect(page.getByText(/no recalcula las alertas ya detectadas/)).toBeVisible()
  })

  test('guardar los mismos parámetros confirma sin alterar nada', async ({ page }) => {
    // Se reenvían los valores actuales para probar el guardado sin cambiar
    // la configuración con la que trabaja el equipo.
    await entrarComoAdmin(page)
    await page.goto('/admin')
    await page.getByLabel('Umbral de anomalía (°C)').waitFor()
    await page.getByRole('button', { name: 'Guardar parámetros' }).click()

    await expect(page.getByTestId('aviso-configuracion')).toContainText('Parámetros guardados')
  })

  test('un umbral fuera de rango se rechaza con un mensaje en español', async ({ page }) => {
    await entrarComoAdmin(page)
    await page.goto('/admin')

    const umbral = page.getByLabel('Umbral de anomalía (°C)')
    const original = await umbral.inputValue()
    await umbral.fill('99')
    await page.getByRole('button', { name: 'Guardar parámetros' }).click()

    await expect(page.getByRole('alert')).toContainText('entre 0.1 y 5.0')
    await umbral.fill(original)
  })

  test('el administrador puede reevaluar las alertas', async ({ page }) => {
    await entrarComoAdmin(page)
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Reevaluar alertas' }).click()

    await expect(page.getByTestId('aviso-configuracion')).toContainText('episodios', {
      timeout: 30_000,
    })
  })

  test('reevaluar dos veces no duplica episodios', async ({ request }) => {
    const sesion = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    const { access_token } = await sesion.json()
    const cabeceras = { Authorization: `Bearer ${access_token}` }

    const primera = await (
      await request.post(`${API_URL}/api/alerts/evaluate`, { headers: cabeceras })
    ).json()
    const segunda = await (
      await request.post(`${API_URL}/api/alerts/evaluate`, { headers: cabeceras })
    ).json()

    expect(segunda.events_total).toBe(primera.events_total)
    expect(segunda.events_removed).toBe(0)
  })
})
