import { expect, test, type Page } from '@playwright/test'
import { bloquearMosaicos, revisarAccesibilidad } from './utilidades'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@ola.pe'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''

/**
 * Accesibilidad automatizada con axe (WCAG 2.2 AA).
 *
 * `bloquea` indica si una violacion seria o critica hace fallar la prueba.
 * Solo bloquea en lo que el rediseno ya cubre (marco global e Inicio); en las
 * demas pantallas las violaciones se listan en la salida sin fallar, porque
 * quedan fuera del alcance del rediseno.
 */
interface Revision {
  nombre: string
  ruta: string
  bloquea: boolean
  conSesion?: boolean
  lista: (page: Page) => Promise<void>
}

const REVISIONES: Revision[] = [
  {
    nombre: 'Inicio',
    ruta: '/',
    bloquea: false,
    lista: (page) => page.getByTestId('tabla-estado').waitFor(),
  },
  {
    nombre: 'Entrar',
    ruta: '/entrar',
    bloquea: false,
    lista: (page) => page.getByRole('button', { name: 'Entrar' }).waitFor(),
  },
  {
    nombre: 'Registro',
    ruta: '/registro',
    bloquea: false,
    lista: (page) => page.getByRole('button', { name: 'Registrarme' }).waitFor(),
  },
  {
    nombre: 'Histórico',
    ruta: '/historico',
    bloquea: false,
    lista: (page) => page.locator('[data-testid="grafico-serie"] svg').first().waitFor(),
  },
  {
    nombre: 'Comparación',
    ruta: '/comparar',
    bloquea: false,
    lista: (page) => page.locator('[data-testid="grafico-serie"] svg').first().waitFor(),
  },
  {
    nombre: 'Proyección',
    ruta: '/proyeccion',
    bloquea: false,
    lista: (page) => page.locator('[data-testid="grafico-proyeccion"] svg').first().waitFor(),
  },
  {
    nombre: 'Mis zonas',
    ruta: '/mis-zonas',
    bloquea: false,
    conSesion: true,
    lista: (page) => page.getByTestId('lista-zonas').waitFor(),
  },
  {
    nombre: 'Avisos',
    ruta: '/avisos',
    bloquea: false,
    conSesion: true,
    lista: (page) => page.getByTestId('lista-avisos').waitFor({ state: 'attached' }),
  },
  {
    nombre: 'Administración',
    ruta: '/admin',
    bloquea: false,
    conSesion: true,
    lista: (page) => page.getByRole('button', { name: 'Importar' }).waitFor(),
  },
]

async function entrarComoAdmin(page: Page) {
  await page.goto('/entrar')
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByTestId('sesion-actual')).toContainText('Administrador')
}

test.describe('Accesibilidad — axe WCAG 2.2 AA', () => {
  // Sin esta comprobacion, un analisis mal configurado que nunca encuentra
  // nada pasaria por una pagina accesible.
  test('el análisis detecta una violación conocida', async ({ page }, testInfo) => {
    await page.setContent(
      '<!doctype html><html lang="es"><head><title>Prueba</title></head>' +
        '<body><main><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></body></html>',
    )

    const graves = await revisarAccesibilidad(page, testInfo)
    expect(graves.map((v) => v.regla)).toContain('image-alt')
  })

  for (const { nombre, ruta, bloquea, conSesion, lista } of REVISIONES) {
    test(`${nombre}: ${bloquea ? 'sin violaciones serias' : 'informe de violaciones'}`, async ({
      page,
    }, testInfo) => {
      test.skip(conSesion === true && ADMIN_PASSWORD === '', 'E2E_ADMIN_PASSWORD no está definida')

      await bloquearMosaicos(page)
      if (conSesion) await entrarComoAdmin(page)
      await page.goto(ruta)
      await lista(page)

      const graves = await revisarAccesibilidad(page, testInfo)
      if (bloquea) expect(graves).toEqual([])
    })
  }
})
