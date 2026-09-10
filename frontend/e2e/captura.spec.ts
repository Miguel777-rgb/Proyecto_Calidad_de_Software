import { test } from '@playwright/test'

// Captura de apoyo para revisar el resultado visual. No es una prueba.
test('captura del mapa', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('.leaflet-overlay-pane path').first().waitFor()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'capturas/mapa-escritorio.png', fullPage: false })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.leaflet-overlay-pane path').nth(6).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'capturas/mapa-celular.png', fullPage: true })
})

test('captura de los graficos', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })

  await page.goto('/historico')
  await page.locator('[data-testid="grafico-serie"] svg').first().waitFor()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'capturas/historico.png' })

  await page.goto('/comparar')
  await page.locator('[data-testid="grafico-serie"] svg').first().waitFor()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'capturas/comparacion.png' })
})

test('captura de la proyeccion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto('/proyeccion')
  await page.locator('[data-testid="grafico-proyeccion"] svg').first().waitFor()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'capturas/proyeccion.png' })
})
