import { expect, test, type Page } from '@playwright/test'
import { CONFIGURACION_FIJA, ESTADO_FIJO } from './datos/estadoFijo'
import { bloquearMosaicos } from './utilidades'

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
      await page.route('**/api/status', (ruta) => ruta.fulfill({ json: ESTADO_FIJO }))
      await page.route('**/api/settings', (ruta) => ruta.fulfill({ json: CONFIGURACION_FIJA }))
    },
    lista: async (page) => {
      await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(10)
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

test.describe('Regresión visual — contenido de las pantallas', () => {
  for (const { nombre, ruta, preparar, lista } of PANTALLAS) {
    test(`${nombre}: el contenido se ve igual que la referencia`, async ({ page }) => {
      await bloquearMosaicos(page)
      await preparar?.(page)
      await page.goto(ruta)
      await lista(page)

      await expect(page.locator('main')).toHaveScreenshot(`${nombre}.png`)
    })
  }
})
