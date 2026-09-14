import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { CONFIGURACION_FIJA, ESTADO_FIJO } from './datos/estadoFijo'

/** Fecha y hora fijas para lo que depende del reloj, como «hace 45 días». */
export const HOY_FIJO = new Date('2026-09-14T12:00:00-05:00')

/**
 * Responde el estado de las zonas y la configuracion con datos fijos: el
 * estado real cambia con cada importacion y cada reevaluacion de alertas.
 */
export async function fijarEstado(page: Page, estado: unknown = ESTADO_FIJO): Promise<void> {
  await page.route('**/api/status', (ruta) => ruta.fulfill({ json: estado }))
  await page.route('**/api/settings', (ruta) => ruta.fulfill({ json: CONFIGURACION_FIJA }))
}

/** Boton que abre el menu de cuenta. Solo existe con la sesion iniciada. */
export const botonCuenta = (page: Page): Locator =>
  page.getByRole('button', { name: /^Menú de cuenta/ })

/**
 * Espera para que aparezca la sesion. Tras entrar, registrarse o recargar, la
 * aplicacion revalida el token con /api/auth/me. Solo tarda milisegundos, pero
 * con varias pruebas registrando usuarios a la vez (bcrypt es costoso) el
 * backend de desarrollo, de un solo proceso, supero los 5 s por defecto.
 */
export const ESPERA_SESION = { timeout: 15_000 }

async function abrirMenuCuenta(page: Page): Promise<void> {
  const boton = botonCuenta(page)
  await expect(boton).toBeVisible(ESPERA_SESION)
  if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click()
}

/**
 * Comprueba la sesion iniciada: abre el menu de cuenta, busca los textos en el
 * bloque «Conectado como» (correo, rol) y vuelve a cerrarlo.
 */
export async function esperarSesion(page: Page, ...textos: string[]): Promise<void> {
  await abrirMenuCuenta(page)
  const sesion = page.getByTestId('sesion-actual')
  for (const texto of textos) await expect(sesion).toContainText(texto)
  await page.keyboard.press('Escape')
  await expect(botonCuenta(page)).toHaveAttribute('aria-expanded', 'false')
}

export async function cerrarSesion(page: Page): Promise<void> {
  await abrirMenuCuenta(page)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(botonCuenta(page)).toHaveCount(0)
}

/**
 * Simula una sesion sin tocar el backend: un token cualquiera en el navegador
 * y respuestas fijas del perfil y de los avisos. Sirve para capturas y
 * revisiones de accesibilidad, donde el correo aleatorio de un registro real
 * cambiaria la imagen en cada corrida. Las pantallas publicas no usan el token.
 */
export async function simularSesion(
  page: Page,
  { rol = 'user', sinLeer = 0 }: { rol?: 'user' | 'admin'; sinLeer?: number } = {},
): Promise<void> {
  const usuario = {
    id: rol === 'admin' ? 1 : 2,
    email: rol === 'admin' ? 'admin@ola.pe' : 'pescador@ejemplo.pe',
    full_name: 'Juan Pescador',
    role: rol,
    is_active: true,
    created_at: '2026-09-10T00:00:00Z',
  }
  await page.addInitScript(() => localStorage.setItem('ola.token', 'token-simulado'))
  await page.route('**/api/auth/me', (ruta) => ruta.fulfill({ json: usuario }))
  await page.route('**/api/notifications', (ruta) =>
    ruta.fulfill({ json: { unread: sinLeer, items: [] } }),
  )
}

/**
 * Corta la descarga de los mosaicos del mapa base.
 *
 * Las capturas de referencia no pueden depender de un servidor externo: un
 * mosaico que llega tarde o cambia de estilo haria fallar la comparacion sin
 * que la aplicacion haya cambiado. Leaflet marca los mosaicos con alt vacio,
 * asi que uno fallido no dibuja el icono de imagen rota.
 */
export async function bloquearMosaicos(page: Page): Promise<void> {
  await page.route(/basemaps\.cartocdn\.com|tile\.openstreetmap\.org/, (ruta) => ruta.abort())
}

/** Etiquetas de axe que cubren WCAG 2.0, 2.1 y 2.2 en los niveles A y AA. */
const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export interface ViolacionResumida {
  regla: string
  impacto: string
  nodos: number
  ayuda: string
}

/**
 * Analiza la pagina con axe y devuelve las violaciones serias o criticas.
 *
 * Todas las violaciones, incluidas las menores, se adjuntan al informe de la
 * prueba y se imprimen, para poder revisarlas aunque no hagan fallar la suite.
 */
export async function revisarAccesibilidad(
  page: Page,
  testInfo: TestInfo,
  selectores: string[] = [],
  {
    exentosDeTamano = [],
  }: {
    /**
     * Elementos que no se miden con la regla de tamaño de objetivo
     * (target-size). Solo para la excepción «equivalente» de WCAG 2.5.8: la
     * misma función está en otro control de la página que sí cumple. El resto
     * de reglas se les sigue aplicando.
     */
    exentosDeTamano?: string[]
  } = {},
): Promise<ViolacionResumida[]> {
  let analisis = new AxeBuilder({ page }).withTags(WCAG_AA)
  for (const selector of selectores) analisis = analisis.include(selector)
  if (exentosDeTamano.length > 0) analisis = analisis.disableRules(['target-size'])
  const resultado = await analisis.analyze()
  const violaciones = [...resultado.violations]

  if (exentosDeTamano.length > 0) {
    let tamano = new AxeBuilder({ page }).withRules(['target-size'])
    for (const selector of selectores) tamano = tamano.include(selector)
    for (const selector of exentosDeTamano) tamano = tamano.exclude(selector)
    violaciones.push(...(await tamano.analyze()).violations)
  }

  const todas: ViolacionResumida[] = violaciones.map((v) => ({
    regla: v.id,
    impacto: v.impact ?? 'desconocido',
    nodos: v.nodes.length,
    ayuda: v.help,
  }))

  await testInfo.attach('axe-violaciones', {
    body: JSON.stringify(violaciones, null, 2),
    contentType: 'application/json',
  })
  if (todas.length === 0) console.log(`  [axe] ${testInfo.title} · sin violaciones`)
  for (const v of todas) {
    console.log(`  [axe] ${testInfo.title} · ${v.impacto} · ${v.regla} (${v.nodos}) — ${v.ayuda}`)
  }

  return todas.filter((v) => v.impacto === 'serious' || v.impacto === 'critical')
}
