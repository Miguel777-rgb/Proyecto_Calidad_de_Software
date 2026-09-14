import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  ESPERA_SESION,
  HOY_FIJO,
  bloquearMosaicos,
  botonCuenta,
  cerrarSesion,
  fijarEstado,
} from './utilidades'

/**
 * Detalle de zona con datos fijos (datos/estadoFijo.ts): Callao en alerta
 * cálida, Pisco en alerta fría, Huacho cálida sin alerta y Matarani sin datos.
 */
const MARCADORES = '.leaflet-marker-pane .marcador-zona'
// Orden del catálogo, de norte a sur.
const INDICE = { CALLAO: 6 }

async function preparar(page: Page) {
  await bloquearMosaicos(page)
  await page.clock.setFixedTime(HOY_FIJO)
  await fijarEstado(page)
}

/** Simula un deslizamiento con el dedo sobre un elemento. */
async function deslizar(elemento: Locator, desde: number, hasta: number) {
  await elemento.evaluate(
    (nodo, [inicio, fin]) => {
      const toque = (y: number) => new Touch({ identifier: 1, target: nodo, clientX: 200, clientY: y })
      const disparar = (tipo: string, y: number, activos: Touch[]) =>
        nodo.dispatchEvent(
          new TouchEvent(tipo, { bubbles: true, touches: activos, changedTouches: [toque(y)] }),
        )
      disparar('touchstart', inicio, [toque(inicio)])
      disparar('touchmove', fin, [toque(fin)])
      disparar('touchend', fin, [])
    },
    [desde, hasta],
  )
}

// Con toda la costa a la vista, en celular Huacho queda bajo Callao y Matarani
// bajo Ilo. Solo se toca un marcador que queda encima (Callao, en alerta); las
// demas zonas se abren como lo haria el usuario: desde su tarjeta o la direccion.
test.describe('Detalle de zona — celular', { tag: '@movil' }, () => {
  test.skip(({ isMobile }) => !isMobile, 'Solo en celular')

  test.beforeEach(async ({ page }) => {
    await preparar(page)
  })

  async function abrirInicio(page: Page, ruta = '/') {
    await page.goto(ruta)
    await expect(page.locator(MARCADORES)).toHaveCount(10)
  }

  test('tocar un marcador abre la hoja con el detalle de la zona', async ({ page }) => {
    await abrirInicio(page)
    await page.locator(MARCADORES).nth(INDICE.CALLAO).tap()

    const hoja = page.getByRole('dialog', { name: 'Detalle de Callao' })
    await expect(hoja).toBeVisible()
    await expect(hoja.getByTestId('panel-alerta')).toContainText('En alerta cálida desde el 24/07/2026')
    await expect(hoja.getByTestId('panel-ultima-medicion')).toContainText('Valor medido el 31/07/2026')
  })

  test('la hoja no ocupa más del 70 % de la pantalla', async ({ page }) => {
    await abrirInicio(page, '/?zona=CALLAO')
    const caja = await page.getByRole('dialog').boundingBox()
    expect(caja!.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.7 + 1)
  })

  test('la hoja se cierra con el botón ✕', async ({ page }) => {
    await abrirInicio(page, '/?zona=HUACHO')
    await page.getByRole('button', { name: 'Cerrar el detalle de la zona' }).tap()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).not.toHaveURL(/zona=/)
  })

  test('tocar fuera de la hoja la cierra', async ({ page }) => {
    await abrirInicio(page, '/?zona=HUACHO')
    await page.getByTestId('fondo-hoja').tap({ position: { x: 20, y: 20 } })
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('deslizar la hoja hacia abajo la cierra', async ({ page }) => {
    await abrirInicio(page, '/?zona=HUACHO')
    const hoja = page.getByRole('dialog')
    await expect(hoja).toBeVisible()

    await deslizar(hoja, 500, 650)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('la dirección recuerda la zona elegida', async ({ page }) => {
    await abrirInicio(page)
    await page.getByTestId('tarjeta-PISCO').tap()
    await expect(page).toHaveURL(/\?zona=PISCO$/)

    await page.reload()
    await expect(page.getByRole('dialog', { name: 'Detalle de Pisco' })).toBeVisible()
  })

  test('una zona sin datos recientes explica por qué no se clasifica', async ({ page }) => {
    await abrirInicio(page)
    await page.getByTestId('tarjeta-MATARANI').tap()
    const hoja = page.getByRole('dialog', { name: 'Detalle de Matarani' })
    await expect(hoja.getByTestId('panel-obsoleta')).toContainText('No hay mediciones desde el 31/12/2016')
  })

  test('un dedo sobre el mapa explica que se mueve con dos', async ({ page }) => {
    await abrirInicio(page)
    const contenedor = page.locator('.leaflet-container')
    await contenedor.evaluate((nodo) => {
      const toque = new Touch({ identifier: 1, target: nodo, clientX: 150, clientY: 150 })
      nodo.dispatchEvent(
        new TouchEvent('touchstart', { bubbles: true, touches: [toque], changedTouches: [toque] }),
      )
    })

    await expect(contenedor).toHaveClass(/leaflet-gesture-handling-touch-warning/)
    await expect(contenedor).toHaveAttribute(
      'data-gesture-handling-touch-content',
      'Usa dos dedos para mover el mapa',
    )
  })
})

test.describe('Detalle de zona — escritorio', () => {
  test.skip(({ isMobile }) => isMobile, 'Solo en escritorio')

  test.beforeEach(async ({ page }) => {
    await preparar(page)
    await page.goto('/')
    await expect(page.locator(MARCADORES)).toHaveCount(10)
  })

  test('los nombres de las zonas se ven en el mapa', async ({ page }) => {
    const etiquetas = page.locator('.etiqueta-zona')
    await expect(etiquetas).toHaveCount(10)
    await expect(etiquetas.first()).toHaveText('Tumbes')
  })

  test('sin zona elegida ofrece accesos a las zonas en alerta', async ({ page }) => {
    const accesos = page.getByTestId('accesos-alerta').getByRole('button')
    await expect(accesos).toHaveText(['Callao', 'Pisco'])

    await accesos.nth(1).click()
    await expect(page.getByTestId('panel-zona').getByRole('heading', { name: 'Pisco' })).toBeVisible()
  })

  test('elegir una zona la resalta sin mover el mapa', async ({ page }) => {
    const panelDelMapa = page.locator('.leaflet-map-pane')
    const antes = await panelDelMapa.getAttribute('style')

    const callao = page.locator(MARCADORES).nth(INDICE.CALLAO)
    await callao.click()
    await expect(callao).toHaveClass(/marcador-zona--elegida/)
    expect(await panelDelMapa.getAttribute('style')).toBe(antes)
  })

  test('la rueda sin Ctrl no acerca el mapa y lo explica', async ({ page }) => {
    const contenedor = page.locator('.leaflet-container')
    const caja = await contenedor.boundingBox()
    await page.mouse.move(caja!.x + caja!.width / 2, caja!.y + caja!.height / 2)
    await page.mouse.wheel(0, 300)

    await expect(contenedor).toHaveClass(/leaflet-gesture-handling-scroll-warning/)
  })

  test('«Ver histórico» abre el histórico de la zona elegida', async ({ page }) => {
    await page.getByTestId('accesos-alerta').getByRole('button', { name: 'Pisco' }).click()
    await page.getByRole('link', { name: 'Ver histórico de Pisco' }).click()

    await expect(page).toHaveURL(/\/historico\?zona=PISCO$/)
    await expect(page.getByLabel('Zona costera')).toHaveValue('PISCO')
  })
})

test.describe('Detalle de zona — avisos', () => {
  test.skip(({ isMobile }) => isMobile, 'Solo en escritorio')

  const correoUnico = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ejemplo.pe`

  async function registrarse(page: Page, email: string) {
    await page.goto('/registro')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña').fill('miclave123')
    await page.getByRole('button', { name: 'Registrarme' }).click()
    await expect(botonCuenta(page)).toBeVisible(ESPERA_SESION)
  }

  test('sin sesión invita a entrar y, tras entrar, vuelve a la misma zona', async ({ page }) => {
    const email = correoUnico()
    await registrarse(page, email)
    await cerrarSesion(page)
    await preparar(page)

    await page.goto('/?zona=PISCO')
    await page.getByRole('link', { name: 'Entra para recibir avisos' }).click()
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña').fill('miclave123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/\?zona=PISCO$/)
    const panel = page.getByTestId('panel-zona')
    await expect(panel.getByRole('heading', { name: 'Pisco' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Recibir avisos de Pisco' })).toBeVisible()
  })

  test('con sesión recibe avisos de una zona y puede dejar de recibirlos', async ({ page }) => {
    await registrarse(page, correoUnico())
    await preparar(page)
    await page.goto('/?zona=HUACHO')

    const panel = page.getByTestId('panel-zona')
    await panel.getByRole('button', { name: 'Recibir avisos de Huacho' }).click()
    await expect(panel.getByText('Recibes avisos de Huacho')).toBeVisible()

    // La suscripción es real: aparece en Mis zonas.
    await page.goto('/mis-zonas')
    await expect(page.getByTestId('siguiendo-HUACHO')).toBeVisible()

    await page.goto('/?zona=HUACHO')
    await panel.getByRole('button', { name: 'Dejar de recibir' }).click()
    await expect(panel.getByRole('button', { name: 'Recibir avisos de Huacho' })).toBeVisible()
  })
})
