import { expect, test, type Page } from '@playwright/test'
import { ESTADO_FIJO } from './datos/estadoFijo'
import { HOY_FIJO, bloquearMosaicos, fijarEstado } from './utilidades'

/**
 * Inicio con datos fijos (datos/estadoFijo.ts): 4 cálidas, 3 neutras, 2 frías
 * y Matarani sin datos; alertas vigentes en Callao (cálida) y Pisco (fría).
 * El reloj se fija al 14/09/2026 para que la antigüedad del dato no cambie.
 */
async function preparar(page: Page, estado: unknown = ESTADO_FIJO) {
  await bloquearMosaicos(page)
  await page.clock.setFixedTime(HOY_FIJO)
  await fijarEstado(page, estado)
}

test.describe('Inicio — resumen del estado del mar', { tag: '@movil' }, () => {
  test('muestra la fecha del último dato y cuántos días tiene', async ({ page }) => {
    await preparar(page)
    await page.goto('/')

    await expect(page.getByTestId('fecha-referencia')).toContainText('31/07/2026')
    const antiguedad = page.getByTestId('antiguedad-dato')
    await expect(antiguedad).toHaveText('hace 45 días')
    // Supera los 7 días de vigencia: se presenta como atrasado.
    await expect(antiguedad).toHaveAttribute('data-atrasado', 'true')
  })

  test('nombra las zonas en alerta con su situación', async ({ page }) => {
    await preparar(page)
    await page.goto('/')

    await expect(page.getByTestId('resumen-alertas')).toHaveText(
      '2 zonas en alerta: Callao (cálida) y Pisco (fría)',
    )
  })

  test('el conteo por estado hace de leyenda', async ({ page }) => {
    await preparar(page)
    await page.goto('/')

    await expect(page.getByTestId('conteo-warm')).toHaveText('4 cálidas')
    await expect(page.getByTestId('conteo-neutral')).toHaveText('3 neutras')
    await expect(page.getByTestId('conteo-cold')).toHaveText('2 frías')
    await expect(page.getByTestId('conteo-no_data')).toHaveText('1 sin datos')
  })

  test('si el servidor falla, «Reintentar» vuelve a cargar', async ({ page }) => {
    await preparar(page)
    let fallar = true
    await page.route('**/api/status', (ruta) =>
      fallar
        ? ruta.fulfill({ status: 500, json: { detail: 'Error interno' } })
        : ruta.fulfill({ json: ESTADO_FIJO }),
    )
    await page.goto('/')

    await expect(page.getByRole('alert')).toContainText('No pudimos cargar el estado del mar.')
    fallar = false
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.getByTestId('fecha-referencia')).toContainText('31/07/2026')
  })

  test('sin datos cargados lo explica sin mostrar mapa ni tabla', async ({ page }) => {
    await preparar(page, { reference_date: null, zones: [] })
    await page.goto('/')

    await expect(page.getByTestId('sin-datos')).toContainText('Aún no hay datos del mar.')
    await expect(page.getByTestId('mapa-zonas')).toHaveCount(0)
    await expect(page.getByTestId('tabla-estado')).toHaveCount(0)
  })
})

test.describe('Inicio — escritorio', () => {
  test.skip(({ isMobile }) => isMobile, 'Solo en escritorio')

  test('muestra la tabla de todas las zonas, con las alertas primero, y no las tarjetas', async ({
    page,
  }) => {
    await preparar(page)
    await page.goto('/')

    const tabla = page.getByTestId('tabla-estado')
    await expect(tabla).toBeVisible()
    await expect(tabla.getByRole('rowheader')).toHaveText([
      'Callao',
      'Pisco',
      'Tumbes',
      'Paita',
      'San José',
      'Chicama',
      'Chimbote',
      'Huacho',
      'Matarani',
      'Ilo',
    ])
    await expect(page.getByTestId('tarjetas-zonas')).toHaveCount(0)
  })

  test('elegir una zona en la tabla abre su detalle', async ({ page }) => {
    await preparar(page)
    await page.goto('/')

    const boton = page.getByTestId('tabla-estado').getByRole('button', { name: 'Pisco' })
    await boton.click()
    await expect(page.getByTestId('panel-zona').getByRole('heading', { name: 'Pisco' })).toBeVisible()
    await expect(boton).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Inicio — celular', { tag: '@movil' }, () => {
  test.skip(({ isMobile }) => !isMobile, 'Solo en celular')

  test('muestra una tarjeta por zona con las alertas primero', async ({ page }) => {
    await preparar(page)
    await page.goto('/')

    const tarjetas = page.getByTestId('tarjetas-zonas').getByRole('button')
    await expect(tarjetas).toHaveCount(10)
    await expect(tarjetas.nth(0)).toHaveAttribute('data-testid', 'tarjeta-CALLAO')
    await expect(tarjetas.nth(1)).toHaveAttribute('data-testid', 'tarjeta-PISCO')
    await expect(page.getByTestId('tarjeta-alerta-CALLAO')).toContainText(
      'En alerta desde 24/07/2026 · 8 mediciones seguidas',
    )
  })

  test('tocar una tarjeta abre el detalle de esa zona en la hoja inferior', async ({ page }) => {
    await preparar(page)
    await page.goto('/')

    const tarjeta = page.getByTestId('tarjeta-HUACHO')
    await tarjeta.tap()
    await expect(tarjeta).toHaveAttribute('aria-pressed', 'true')
    const hoja = page.getByRole('dialog', { name: 'Detalle de Huacho' })
    await expect(hoja).toBeInViewport()
    await expect(hoja.getByRole('heading', { name: 'Huacho' })).toBeVisible()
  })

  test('la tabla completa está dentro de «Ver todos los datos»', async ({ page }) => {
    await preparar(page)
    await page.goto('/')

    await expect(page.getByTestId('tabla-estado')).toBeHidden()
    await page.getByText('Ver todos los datos').tap()
    await expect(page.getByTestId('tabla-estado')).toBeVisible()
  })

  test('tarjetas y tabla abierta no desbordan la pantalla', async ({ page }) => {
    await preparar(page)
    await page.goto('/')
    await page.getByText('Ver todos los datos').tap()

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(desborde).toBe(false)
  })
})
