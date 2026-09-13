import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'

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
  selector?: string,
): Promise<ViolacionResumida[]> {
  let analisis = new AxeBuilder({ page }).withTags(WCAG_AA)
  if (selector !== undefined) analisis = analisis.include(selector)
  const resultado = await analisis.analyze()

  const todas: ViolacionResumida[] = resultado.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact ?? 'desconocido',
    nodos: v.nodes.length,
    ayuda: v.help,
  }))

  await testInfo.attach('axe-violaciones', {
    body: JSON.stringify(resultado.violations, null, 2),
    contentType: 'application/json',
  })
  if (todas.length === 0) console.log(`  [axe] ${testInfo.title} · sin violaciones`)
  for (const v of todas) {
    console.log(`  [axe] ${testInfo.title} · ${v.impacto} · ${v.regla} (${v.nodos}) — ${v.ayuda}`)
  }

  return todas.filter((v) => v.impacto === 'serious' || v.impacto === 'critical')
}
