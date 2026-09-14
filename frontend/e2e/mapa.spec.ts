import { expect, test, type Page } from '@playwright/test'
import { HOY_FIJO, bloquearMosaicos, fijarEstado } from './utilidades'

/**
 * Estas pruebas ejercitan el mapa de Leaflet de verdad, en un navegador. Es la
 * unica capa donde puede hacerse: en jsdom, Leaflet no llega a montarse porque
 * necesita medir el contenedor real.
 *
 * Usan el estado fijo (datos/estadoFijo.ts): el calculo real del estado ya lo
 * prueba estado.spec.ts, y con varias pruebas en paralelo /api/status puede
 * tardar mas que el tiempo de espera. Tampoco se descargan mosaicos: dependeria
 * de una red externa. El detalle en celular y los gestos estan en detalle.spec.ts.
 */
const MARCADORES = '.leaflet-marker-pane .marcador-zona'

async function abrirInicio(page: Page) {
  await bloquearMosaicos(page)
  await page.clock.setFixedTime(HOY_FIJO)
  await fijarEstado(page)
  await page.goto('/')
  await expect(page.locator(MARCADORES)).toHaveCount(10)
}

test.describe('Fase 4 — mapa interactivo (RF-04)', () => {
  test('el mapa se dibuja sin necesidad de iniciar sesión', async ({ page }) => {
    await abrirInicio(page)
    await expect(page.getByTestId('mapa-zonas')).toBeVisible()
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })

  test('atribuye el mapa base a OpenStreetMap, como exige su licencia', async ({ page }) => {
    await abrirInicio(page)
    await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap')
  })

  test('mantiene visible la atribución a IMARPE junto a la del mapa', async ({ page }) => {
    await abrirInicio(page)
    await expect(page.getByTestId('atribucion')).toContainText('IMARPE')
  })

  test('el panel invita a elegir una zona antes de pulsar nada', async ({ page }) => {
    await abrirInicio(page)
    await expect(page.getByTestId('panel-zona')).toContainText('Elige una zona en el mapa')
  })

  test('al pulsar una zona se abre su detalle', async ({ page }) => {
    await abrirInicio(page)
    await page.locator(MARCADORES).first().click()

    const panel = page.getByTestId('panel-zona')
    // El catálogo va de norte a sur, así que el primer marcador es Tumbes.
    await expect(panel.getByRole('heading', { name: 'Tumbes' })).toBeVisible()
    await expect(page.getByTestId('panel-promedio')).toBeVisible()
    await expect(page.getByTestId('panel-ultima-medicion')).toBeVisible()
  })

  test('elegir otra zona reemplaza el detalle', async ({ page }) => {
    await abrirInicio(page)
    const panel = page.getByTestId('panel-zona')
    await page.locator(MARCADORES).first().click()
    await expect(panel.getByRole('heading', { name: 'Tumbes' })).toBeVisible()

    await page.locator(MARCADORES).last().click()
    await expect(panel.getByRole('heading', { name: 'Ilo' })).toBeVisible()
    await expect(panel.getByRole('heading', { name: 'Tumbes' })).toHaveCount(0)
  })

  test('el detalle se puede cerrar', async ({ page }) => {
    await abrirInicio(page)
    await page.locator(MARCADORES).first().click()
    await page.getByRole('button', { name: 'Cerrar el detalle de la zona' }).click()

    await expect(page.getByTestId('panel-zona')).toContainText('Elige una zona en el mapa')
  })

  test('una zona también se elige con el teclado', async ({ page }) => {
    await abrirInicio(page)
    const callao = page.locator(MARCADORES).nth(6)
    await callao.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('panel-zona').getByRole('heading', { name: 'Callao' })).toBeVisible()
    await expect(callao).toHaveAttribute('aria-pressed', 'true')

    // Tambien con la barra espaciadora, como cualquier boton.
    const pisco = page.locator(MARCADORES).nth(7)
    await pisco.focus()
    await page.keyboard.press(' ')
    await expect(page.getByTestId('panel-zona').getByRole('heading', { name: 'Pisco' })).toBeVisible()
  })

  test('la zona descontinuada avisa que no tiene datos recientes', async ({ page }) => {
    await abrirInicio(page)
    // MATARANI es la novena de norte a sur.
    await page.locator(MARCADORES).nth(8).click()

    await expect(page.getByRole('heading', { name: 'Matarani' })).toBeVisible()
    await expect(page.getByTestId('panel-obsoleta')).toBeVisible()
    await expect(page.getByTestId('panel-alerta')).toHaveCount(0)
  })

  test('la tabla sigue disponible como alternativa accesible', async ({ page }) => {
    await abrirInicio(page)
    await expect(page.getByTestId('tabla-estado')).toBeVisible()
    await expect(page.getByTestId('situacion-MATARANI')).toHaveText('Sin datos recientes')
  })

  test('el conteo por estado acompaña siempre al mapa', async ({ page }) => {
    await abrirInicio(page)
    await expect(page.getByTestId('leyenda')).toBeVisible()
  })

  test('la página no genera desplazamiento horizontal en celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await abrirInicio(page)

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(desborde).toBe(false)
  })
})
