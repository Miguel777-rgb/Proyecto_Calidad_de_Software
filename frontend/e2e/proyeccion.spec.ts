import { expect, test, type Page } from '@playwright/test'

const grafico = '[data-testid="grafico-proyeccion"]'

async function esperarGrafico(page: Page) {
  await page.locator(`${grafico} svg`).first().waitFor()
}

test.describe('Fase 6 — proyección de tendencia (RF-02)', () => {
  test('la proyección es pública', async ({ page }) => {
    await page.goto('/proyeccion')
    await expect(page.getByRole('heading', { name: 'Proyección de tendencia' })).toBeVisible()
  })

  test('advierte que es una estimación y no un pronóstico', async ({ page }) => {
    // La SRS exige marcar la proyección explícitamente como aproximada.
    await page.goto('/proyeccion')
    const aviso = page.getByTestId('advertencia-estimacion')
    await expect(aviso).toContainText('no un pronóstico')
    await expect(aviso).toContainText('ENFEN')
  })

  test('muestra las dos estimaciones que admite el requisito', async ({ page }) => {
    await page.goto('/proyeccion')
    await esperarGrafico(page)

    const estimaciones = page.getByTestId('estimaciones')
    await expect(estimaciones).toContainText('Según la tendencia')
    await expect(estimaciones).toContainText('Según el nivel reciente')
    await expect(page.getByTestId('valor-tendencia')).toContainText('°C')
    await expect(page.getByTestId('valor-nivel')).toContainText('°C')
  })

  test('compara cuánto se parecen las dos estimaciones', async ({ page }) => {
    await page.goto('/proyeccion')
    await esperarGrafico(page)
    await expect(page.getByTestId('acuerdo')).toBeVisible()
  })

  test('el tramo estimado se dibuja sombreado y con línea punteada', async ({ page }) => {
    await page.goto('/proyeccion')
    await esperarGrafico(page)

    // Fondo sombreado.
    await expect(page.locator(`${grafico} .recharts-reference-area`)).toBeVisible()
    await expect(page.getByText('Tramo estimado')).toBeVisible()

    // Las dos líneas de estimación van punteadas; la medida, continua.
    const punteadas = await page
      .locator(`${grafico} .recharts-line-curve[stroke-dasharray]`)
      .count()
    expect(punteadas).toBe(2)
  })

  test('el horizonte por defecto es de cinco días', async ({ page }) => {
    await page.goto('/proyeccion')
    await expect(page.getByLabel('Días a proyectar')).toHaveValue('5')
  })

  test('permite ajustar el horizonte entre 3 y 7 días', async ({ page }) => {
    await page.goto('/proyeccion')
    await esperarGrafico(page)

    const opciones = await page.getByLabel('Días a proyectar').locator('option').allTextContents()
    expect(opciones).toEqual(['3 días', '4 días', '5 días', '6 días', '7 días'])

    await page.getByLabel('Días a proyectar').selectOption('7')
    await esperarGrafico(page)
    await expect(page.getByTestId('valor-tendencia')).toContainText('°C')
  })

  test('permite elegir la zona', async ({ page }) => {
    await page.goto('/proyeccion')
    await esperarGrafico(page)

    await page.getByLabel('Zona costera').selectOption('PISCO')
    await esperarGrafico(page)
    await expect(page.getByTestId('confianza')).toBeVisible()
  })

  test('una zona al día se marca con confianza alta', async ({ page }) => {
    await page.goto('/proyeccion')
    await page.getByLabel('Zona costera').selectOption('CALLAO')
    await esperarGrafico(page)

    await expect(page.getByTestId('confianza')).toContainText('Alta')
  })

  test('una zona descontinuada se proyecta con confianza baja y aviso', async ({ page }) => {
    await page.goto('/proyeccion')
    await page.getByLabel('Zona costera').selectOption('MATARANI')
    await esperarGrafico(page)

    // Se proyecta igualmente, pero advirtiendo. Las fechas estimadas parten
    // de su propio último dato, de 2016.
    await expect(page.getByTestId('confianza')).toContainText('Baja')
    await expect(page.getByTestId('dato-atrasado')).toContainText('días')
    await expect(page.getByTestId('estimaciones')).toBeVisible()
  })

  test('en celular la página no desborda', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/proyeccion')
    await esperarGrafico(page)

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(desborde).toBe(false)
  })
})
