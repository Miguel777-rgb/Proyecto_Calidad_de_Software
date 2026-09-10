import { expect, test } from '@playwright/test'

/**
 * Estas pruebas ejercitan el mapa de Leaflet de verdad, en un navegador. Es la
 * unica capa donde puede hacerse: en jsdom, Leaflet no llega a montarse porque
 * necesita medir el contenedor real.
 *
 * No se comprueba que los mosaicos de OpenStreetMap se descarguen: eso
 * dependeria de una red externa y volveria las pruebas inestables.
 */
test.describe('Fase 4 — mapa interactivo (RF-04)', () => {
  const circulos = '.leaflet-overlay-pane path'

  test('el mapa se dibuja sin necesidad de iniciar sesión', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('mapa-zonas')).toBeVisible()
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })

  test('dibuja las 10 zonas costeras', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(circulos)).toHaveCount(10)
  })

  test('muestra la atribución de OpenStreetMap, obligatoria por su licencia', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap')
  })

  test('mantiene visible la atribución a IMARPE junto a la del mapa', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('atribucion')).toContainText('IMARPE')
  })

  test('el panel invita a elegir una zona antes de pulsar nada', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('panel-zona')).toContainText('Pulsa una zona del mapa')
  })

  test('al pulsar una zona se abre su detalle', async ({ page }) => {
    await page.goto('/')
    await page.locator(circulos).first().click()

    const panel = page.getByTestId('panel-zona')
    // El catálogo va de norte a sur, así que el primer círculo es Tumbes.
    await expect(panel.getByRole('heading', { name: 'Tumbes' })).toBeVisible()
    await expect(page.getByTestId('panel-promedio')).toBeVisible()
    await expect(page.getByTestId('panel-ultima-medicion')).toBeVisible()
  })

  test('elegir otra zona reemplaza el detalle', async ({ page }) => {
    await page.goto('/')
    await page.locator(circulos).first().click()
    await expect(page.getByRole('heading', { name: 'Tumbes' })).toBeVisible()

    await page.locator(circulos).last().click()
    await expect(page.getByRole('heading', { name: 'Ilo' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tumbes' })).toHaveCount(0)
  })

  test('el detalle se puede cerrar', async ({ page }) => {
    await page.goto('/')
    await page.locator(circulos).first().click()
    await page.getByRole('button', { name: 'Cerrar el detalle de la zona' }).click()

    await expect(page.getByTestId('panel-zona')).toContainText('Pulsa una zona del mapa')
  })

  test('la zona descontinuada avisa que no tiene datos recientes', async ({ page }) => {
    await page.goto('/')
    // MATARANI es la novena de norte a sur.
    await page.locator(circulos).nth(8).click()

    await expect(page.getByRole('heading', { name: 'Matarani' })).toBeVisible()
    await expect(page.getByTestId('panel-obsoleta')).toBeVisible()
    await expect(page.getByTestId('panel-alerta')).toHaveCount(0)
  })

  test('la tabla sigue disponible como alternativa accesible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('tabla-estado')).toBeVisible()
    await expect(page.getByTestId('situacion-MATARANI')).toHaveText('Sin datos recientes')
  })

  test('la leyenda acompaña siempre al mapa', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('leyenda')).toBeVisible()
  })

  test('en pantalla de celular el panel queda debajo del mapa, sin taparlo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const mapa = await page.getByTestId('mapa-zonas').boundingBox()
    const panel = await page.getByTestId('panel-zona').boundingBox()
    expect(panel!.y).toBeGreaterThanOrEqual(mapa!.y + mapa!.height - 1)
  })

  test('la página no genera desplazamiento horizontal en celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByTestId('mapa-zonas')).toBeVisible()

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(desborde).toBe(false)
  })
})
