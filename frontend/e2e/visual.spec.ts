import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { HOY_FIJO, bloquearMosaicos, botonCuenta, fijarEstado, simularSesion } from './utilidades'

/**
 * Regresion visual del contenido de cada pantalla.
 *
 * Se captura solo <main>: la cabecera, la navegacion y el pie tienen sus
 * propias referencias. Las imagenes de referencia se generan SIEMPRE dentro
 * del contenedor de Playwright, porque el dibujo de las fuentes cambia entre
 * sistemas operativos. Para regenerarlas a proposito, tras aprobar un cambio
 * visual:
 *   pnpm exec playwright test visual.spec.ts --update-snapshots
 */
const OCULTAR_MARCO = fileURLToPath(new URL('./ocultar-marco.css', import.meta.url))

interface Pantalla {
  nombre: string
  ruta: string
  /** Prepara la pagina antes de navegar, p. ej. fijando respuestas de la API. */
  preparar?: (page: Page) => Promise<void>
  lista: (page: Page) => Promise<void>
}

const PANTALLAS: Pantalla[] = [
  {
    nombre: 'inicio',
    ruta: '/',
    preparar: async (page) => {
      // Reloj fijo: la antiguedad del dato («hace 45 días») cambia cada dia.
      await page.clock.setFixedTime(HOY_FIJO)
      await fijarEstado(page)
    },
    lista: async (page) => {
      await expect(page.locator('.leaflet-marker-pane .marcador-zona')).toHaveCount(10)
      await page.getByTestId('tabla-estado').waitFor()
    },
  },
  {
    nombre: 'entrar',
    ruta: '/entrar',
    lista: (page) => page.getByRole('button', { name: 'Entrar' }).waitFor(),
  },
  {
    nombre: 'registro',
    ruta: '/registro',
    lista: (page) => page.getByRole('button', { name: 'Registrarme' }).waitFor(),
  },
  {
    nombre: 'historico',
    ruta: '/historico',
    lista: (page) => page.locator('[data-testid="grafico-serie"] svg').first().waitFor(),
  },
  {
    nombre: 'comparacion',
    ruta: '/comparar',
    lista: (page) => page.locator('[data-testid="grafico-serie"] svg').first().waitFor(),
  },
  {
    nombre: 'proyeccion',
    ruta: '/proyeccion',
    lista: (page) => page.locator('[data-testid="grafico-proyeccion"] svg').first().waitFor(),
  },
]

/**
 * Marco global en escritorio y en celular (el nombre de la referencia lleva el
 * proyecto). Se usa Histórico porque su contenido no se rediseña y sus datos
 * no cambian entre corridas. No se tapa `main` con `mask`: la mascara se pinta
 * encima de todo su rectangulo y ocultaria el menu desplegable y la barra
 * inferior, que son justo lo que se quiere comparar.
 */
test.describe('Regresión visual — marco global', { tag: '@movil' }, () => {
  test('marco sin sesión', async ({ page }) => {
    await page.goto('/historico')
    await page.locator('[data-testid="grafico-serie"] svg').first().waitFor()

    await expect(page).toHaveScreenshot('marco-sin-sesion.png')
  })

  test('marco con sesión, avisos sin leer y el menú abierto', async ({ page }) => {
    await simularSesion(page, { rol: 'admin', sinLeer: 2 })
    await page.goto('/historico')
    await page.locator('[data-testid="grafico-serie"] svg').first().waitFor()
    await botonCuenta(page).click()
    await page.getByTestId('sesion-actual').waitFor()

    await expect(page).toHaveScreenshot('marco-menu-abierto.png')
  })

  test('pie de página', async ({ page }) => {
    await page.goto('/entrar')
    await expect(page.getByRole('contentinfo')).toHaveScreenshot('pie.png')
  })
})

test.describe('Regresión visual — Inicio en celular', { tag: '@movil' }, () => {
  test.skip(({ isMobile }) => !isMobile, 'Solo en celular')

  test('inicio con tarjetas y la tabla desplegada', async ({ page }) => {
    await bloquearMosaicos(page)
    await page.clock.setFixedTime(HOY_FIJO)
    await fijarEstado(page)
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-pane .marcador-zona')).toHaveCount(10)
    await page.getByText('Ver todos los datos').click()

    await expect(page).toHaveScreenshot('inicio-celular.png', {
      fullPage: true,
      stylePath: OCULTAR_MARCO,
    })
  })
})

// Detalle de una zona en alerta: hoja inferior en celular, panel en escritorio.
test.describe('Regresión visual — detalle de zona', { tag: '@movil' }, () => {
  test('detalle de una zona en alerta', async ({ page, isMobile }) => {
    await bloquearMosaicos(page)
    await page.clock.setFixedTime(HOY_FIJO)
    await fijarEstado(page)
    await page.goto('/?zona=CALLAO')
    await expect(page.locator('.leaflet-marker-pane .marcador-zona')).toHaveCount(10)

    if (isMobile) {
      await expect(page.getByRole('dialog', { name: 'Detalle de Callao' })).toBeVisible()
      await expect(page).toHaveScreenshot('detalle-hoja.png')
    } else {
      const panel = page.getByTestId('panel-zona')
      await expect(panel.getByRole('heading', { name: 'Callao' })).toBeVisible()
      await expect(panel).toHaveScreenshot('detalle-panel.png')
    }
  })
})

test.describe('Regresión visual — contenido de las pantallas', () => {
  for (const { nombre, ruta, preparar, lista } of PANTALLAS) {
    test(`${nombre}: el contenido se ve igual que la referencia`, async ({ page }) => {
      await bloquearMosaicos(page)
      await preparar?.(page)
      await page.goto(ruta)
      await lista(page)

      await expect(page.locator('main')).toHaveScreenshot(`${nombre}.png`, {
        stylePath: OCULTAR_MARCO,
      })
    })
  }
})
