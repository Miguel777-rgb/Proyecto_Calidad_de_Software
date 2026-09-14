import { expect, test, type Page } from '@playwright/test'
import {
  HOY_FIJO,
  bloquearMosaicos,
  botonCuenta,
  esperarSesion,
  fijarEstado,
  revisarAccesibilidad,
  simularSesion,
} from './utilidades'

// Inicio ya esta redisenado: una violacion seria hace fallar la prueba. Se
// revisa con datos fijos (alertas, zona sin datos) y con la tabla abierta en
// celular, para que axe vea todo lo que Inicio puede mostrar.
//
// Los marcadores del mapa quedan fuera de la regla de tamaño de objetivo: con
// toda la costa a la vista, zonas vecinas se solapan. WCAG 2.5.8 lo admite
// cuando la misma función está en otro control que cumple, y aquí lo están
// las tarjetas (celular) y la tabla (escritorio).
const MARCADORES_EXENTOS = { exentosDeTamano: ['.marcador-zona'] }

test.describe('Accesibilidad — Inicio', { tag: '@movil' }, () => {
  test('Inicio con alertas y todos los datos a la vista: sin violaciones serias', async ({
    page,
    isMobile,
  }, testInfo) => {
    await bloquearMosaicos(page)
    await page.clock.setFixedTime(HOY_FIJO)
    await fijarEstado(page)
    await page.goto('/')
    await page.getByTestId('fecha-referencia').waitFor()
    if (isMobile) await page.getByText('Ver todos los datos').click()
    await page.getByTestId('tabla-estado').waitFor()

    expect(await revisarAccesibilidad(page, testInfo, [], MARCADORES_EXENTOS)).toEqual([])
  })

  test('detalle de una zona abierto: sin violaciones serias', async ({ page, isMobile }, testInfo) => {
    await bloquearMosaicos(page)
    await page.clock.setFixedTime(HOY_FIJO)
    await fijarEstado(page)
    await page.goto('/?zona=CALLAO')
    if (isMobile) {
      await page.getByRole('dialog', { name: 'Detalle de Callao' }).waitFor()
    } else {
      await page.getByTestId('panel-zona').getByRole('heading', { name: 'Callao' }).waitFor()
    }

    expect(await revisarAccesibilidad(page, testInfo, [], MARCADORES_EXENTOS)).toEqual([])
  })
})

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@ola.pe'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''

/**
 * Accesibilidad automatizada con axe (WCAG 2.2 AA).
 *
 * `bloquea` indica si una violacion seria o critica hace fallar la prueba. Al
 * cerrar el rediseno todas las pantallas estaban sin violaciones, asi que todas
 * bloquean: ninguna nueva puede colarse sin que la suite lo diga. Poner una en
 * false solo deja la revision como informe.
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
    nombre: 'Entrar',
    ruta: '/entrar',
    bloquea: true,
    lista: (page) => page.getByRole('button', { name: 'Entrar' }).waitFor(),
  },
  {
    nombre: 'Registro',
    ruta: '/registro',
    bloquea: true,
    lista: (page) => page.getByRole('button', { name: 'Registrarme' }).waitFor(),
  },
  {
    nombre: 'Histórico',
    ruta: '/historico',
    bloquea: true,
    lista: (page) => page.locator('[data-testid="grafico-serie"] svg').first().waitFor(),
  },
  {
    nombre: 'Comparación',
    ruta: '/comparar',
    bloquea: true,
    lista: (page) => page.locator('[data-testid="grafico-serie"] svg').first().waitFor(),
  },
  {
    nombre: 'Proyección',
    ruta: '/proyeccion',
    bloquea: true,
    lista: (page) => page.locator('[data-testid="grafico-proyeccion"] svg').first().waitFor(),
  },
  {
    nombre: 'Mis zonas',
    ruta: '/mis-zonas',
    bloquea: true,
    conSesion: true,
    lista: (page) => page.getByTestId('lista-zonas').waitFor(),
  },
  {
    nombre: 'Avisos',
    ruta: '/avisos',
    bloquea: true,
    conSesion: true,
    lista: (page) => page.getByTestId('lista-avisos').waitFor({ state: 'attached' }),
  },
  {
    nombre: 'Administración',
    ruta: '/admin',
    bloquea: true,
    conSesion: true,
    lista: (page) => page.getByRole('button', { name: 'Importar' }).waitFor(),
  },
]

async function entrarComoAdmin(page: Page) {
  await page.goto('/entrar')
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await esperarSesion(page, 'Administrador')
}

/** Partes del marco global, presentes en todas las pantallas. */
const MARCO = ['header', 'footer', '[data-testid="barra-inferior"]']

// El marco ya esta redisenado: aqui una violacion seria SI hace fallar la
// prueba. Corre en escritorio y en celular, porque cada uno muestra una
// navegacion distinta.
test.describe('Accesibilidad — marco global', { tag: '@movil' }, () => {
  test('marco sin sesión: sin violaciones serias', async ({ page }, testInfo) => {
    await page.goto('/historico')
    await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).waitFor()

    expect(await revisarAccesibilidad(page, testInfo, MARCO)).toEqual([])
  })

  test('marco con el menú de cuenta abierto: sin violaciones serias', async ({
    page,
  }, testInfo) => {
    await simularSesion(page, { rol: 'admin', sinLeer: 2 })
    await page.goto('/historico')
    await botonCuenta(page).click()
    await page.getByTestId('sesion-actual').waitFor()

    expect(await revisarAccesibilidad(page, testInfo, MARCO)).toEqual([])
  })
})

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
