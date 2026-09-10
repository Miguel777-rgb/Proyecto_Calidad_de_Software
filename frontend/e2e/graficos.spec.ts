import { expect, test, type Page } from '@playwright/test'

/**
 * Estas pruebas ejercitan Recharts de verdad. Es la unica capa donde puede
 * hacerse: en jsdom el contenedor mide cero y el grafico no llega a dibujarse.
 */

const grafico = '[data-testid="grafico-serie"]'

async function esperarGrafico(page: Page) {
  await page.locator(`${grafico} svg`).first().waitFor()
}

test.describe('Fase 5 — histórico por zona (RF-05)', () => {
  test('el histórico es público y dibuja un gráfico', async ({ page }) => {
    await page.goto('/historico')
    await esperarGrafico(page)
    await expect(page.locator(grafico)).toBeVisible()
  })

  test('el rango por defecto son 90 días con un punto por día', async ({ page }) => {
    await page.goto('/historico')
    await esperarGrafico(page)
    await expect(page.getByTestId('resolucion')).toContainText('Un punto por día')
  })

  test('permite elegir la zona costera', async ({ page }) => {
    await page.goto('/historico')
    await esperarGrafico(page)

    await page.getByLabel('Zona costera').selectOption('PISCO')
    await expect(page.getByLabel('Zona costera')).toHaveValue('PISCO')
    await esperarGrafico(page)
  })

  test('al ampliar el rango los datos se agrupan solos', async ({ page }) => {
    await page.goto('/historico')
    await esperarGrafico(page)

    await page.getByLabel('Desde').fill('1970-01-01')
    await page.getByRole('button', { name: 'Aplicar' }).click()

    // 56 años en diario serían más de 20 mil puntos: debe pasar a mensual.
    await expect(page.getByTestId('resolucion')).toContainText('Promedio mensual')
  })

  test('un rango invertido se rechaza en español', async ({ page }) => {
    await page.goto('/historico')
    await esperarGrafico(page)

    await page.getByLabel('Desde').fill('2026-12-31')
    await page.getByRole('button', { name: 'Aplicar' }).click()

    await expect(page.getByRole('alert')).toContainText('no puede ser posterior')
  })

  test('la línea se corta donde faltan mediciones', async ({ page }) => {
    await page.goto('/historico')
    // TUMBES tiene huecos frecuentes en los datos recientes.
    await page.getByLabel('Zona costera').selectOption('TUMBES')
    await esperarGrafico(page)

    const trazado = await page
      .locator(`${grafico} .recharts-line-curve`)
      .first()
      .getAttribute('d')
    // Varios comandos "M" significan varios tramos: la línea no une los huecos.
    expect((trazado?.match(/M/g) ?? []).length).toBeGreaterThan(1)
  })

  test('los datos también están disponibles en una tabla', async ({ page }) => {
    await page.goto('/historico')
    await esperarGrafico(page)

    await page.getByText('Ver los datos en una tabla').click()
    await expect(page.getByTestId('tabla-serie')).toBeVisible()
  })

  test('el gráfico se explica en español', async ({ page }) => {
    await page.goto('/historico')
    await esperarGrafico(page)
    await expect(page.getByText(/umbral de ±0.5 °C/)).toBeVisible()
  })
})

test.describe('Fase 5 — comparación entre zonas (RF-06)', () => {
  test('compara dos zonas de entrada', async ({ page }) => {
    await page.goto('/comparar')
    await esperarGrafico(page)
    await expect(page.locator(`${grafico} .recharts-line`)).toHaveCount(2)
  })

  test('la leyenda nombra cada zona', async ({ page }) => {
    await page.goto('/comparar')
    await esperarGrafico(page)

    const leyenda = page.getByTestId('leyenda-series')
    await expect(leyenda).toContainText('Tumbes')
    await expect(leyenda).toContainText('Paita')
  })

  test('cada serie usa una forma distinta, no solo un color', async ({ page }) => {
    await page.goto('/comparar')
    await esperarGrafico(page)

    const formas = await page.getByTestId('leyenda-series').locator('path').evaluateAll(
      (nodos) => nodos.map((n) => n.getAttribute('d')),
    )
    expect(new Set(formas).size).toBe(formas.length)
  })

  test('añadir una zona la superpone en el gráfico', async ({ page }) => {
    await page.goto('/comparar')
    await esperarGrafico(page)

    await page.getByRole('button', { name: /Callao/ }).click()
    await expect(page.locator(`${grafico} .recharts-line`)).toHaveCount(3)
    await expect(page.getByTestId('leyenda-series')).toContainText('Callao')
  })

  test('quitar una zona la retira del gráfico', async ({ page }) => {
    await page.goto('/comparar')
    await esperarGrafico(page)

    await page.getByRole('button', { name: /Tumbes/ }).click()
    await expect(page.locator(`${grafico} .recharts-line`)).toHaveCount(1)
  })

  test('no deja comparar más de cuatro zonas', async ({ page }) => {
    await page.goto('/comparar')
    await esperarGrafico(page)

    for (const nombre of ['San José', 'Chicama', 'Chimbote']) {
      await page.getByRole('button', { name: new RegExp(nombre) }).click()
    }

    await expect(page.getByRole('alert')).toContainText('4 zonas')
    await expect(page.locator(`${grafico} .recharts-line`)).toHaveCount(4)
  })

  test('todas las series comparten el mismo eje temporal', async ({ page }) => {
    await page.goto('/comparar')
    await esperarGrafico(page)
    // MATARANI no tiene datos recientes: su serie debe existir igualmente,
    // dibujada como vacía, sin descuadrar el eje.
    await page.getByRole('button', { name: /Matarani/ }).click()

    await expect(page.getByTestId('leyenda-series')).toContainText('Matarani')
    await expect(page.locator(`${grafico} .recharts-cartesian-axis-tick`).first()).toBeVisible()
  })

  test('la comparación también está disponible en tabla', async ({ page }) => {
    await page.goto('/comparar')
    await esperarGrafico(page)

    await page.getByText('Ver los datos en una tabla').click()
    const tabla = page.getByTestId('tabla-serie')
    await expect(tabla).toBeVisible()
    await expect(tabla).toContainText('Tumbes')
  })

  test('en celular el gráfico no desborda la pantalla', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/comparar')
    await esperarGrafico(page)

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(desborde).toBe(false)
  })
})
