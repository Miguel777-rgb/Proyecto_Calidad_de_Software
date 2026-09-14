import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { devices, expect, test, type Browser } from '@playwright/test'
import { bloquearMosaicos } from './utilidades'

/**
 * Rendimiento de la portada contra la build de produccion (SRS, seccion 3.3:
 * «el mapa interactivo debera cargar en no mas de 3 segundos bajo condiciones
 * normales de red»).
 *
 * No corre con la suite normal: compila y sirve la build. Se ejecuta con
 *   pnpm test:rendimiento
 *
 * Decisiones de la medicion:
 * - Celular (Pixel 7) con 4G normal: 9 Mbps de bajada, 1.5 de subida, 40 ms de
 *   latencia y la CPU al doble de lenta.
 * - Carga en frio (sin cache), repetida tres veces; se evalua la mediana.
 * - «Mapa cargado» es cuando se ven las 10 zonas. Los mosaicos de OpenStreetMap
 *   se excluyen: dependen de un servidor externo, no de OLA.
 * - `vite preview` no comprime, asi que la medicion es pesimista respecto a
 *   Nginx en produccion, que si sirve gzip.
 */
const LIMITE_MAPA_MS = 3000
const PRESUPUESTO_PORTADA_KB = 200
const MARCADORES = '.leaflet-marker-pane .marcador-zona'
const DIST = fileURLToPath(new URL('../dist', import.meta.url))

const MEGABIT = (1024 * 1024) / 8

async function cargarPortada(browser: Browser) {
  const contexto = await browser.newContext({ ...devices['Pixel 7'] })
  const pagina = await contexto.newPage()
  const cdp = await contexto.newCDPSession(pagina)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 40,
    downloadThroughput: 9 * MEGABIT,
    uploadThroughput: 1.5 * MEGABIT,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 })
  await bloquearMosaicos(pagina)

  const recursos = new Set<string>()
  pagina.on('response', (respuesta) => {
    const ruta = new URL(respuesta.url()).pathname
    if (ruta.startsWith('/assets/') && /\.(js|css)$/.test(ruta)) recursos.add(ruta)
  })

  await pagina.goto('/', { waitUntil: 'commit' })
  // El instante se toma dentro de la pagina, justo cuando aparecen las 10
  // zonas; performance.now() cuenta desde el inicio de la navegacion.
  const instante = await pagina.waitForFunction(
    (selector) => {
      const zonas = document.querySelectorAll(selector).length
      return zonas === 10 ? performance.now() : false
    },
    MARCADORES,
    { timeout: 20_000, polling: 'raf' },
  )
  const milisegundos = (await instante.jsonValue()) as number

  await contexto.close()
  return { milisegundos, recursos: [...recursos] }
}

test.describe('Rendimiento — portada', () => {
  test(`el mapa muestra las 10 zonas en ${LIMITE_MAPA_MS} ms o menos con 4G normal`, async ({
    browser,
  }) => {
    const tiempos: number[] = []
    for (let intento = 1; intento <= 3; intento++) {
      const { milisegundos } = await cargarPortada(browser)
      tiempos.push(Math.round(milisegundos))
    }
    const mediana = [...tiempos].sort((a, b) => a - b)[1]
    console.log(`  [rendimiento] mapa con 10 zonas: ${tiempos.join(' ms, ')} ms · mediana ${mediana} ms`)

    expect(mediana).toBeLessThanOrEqual(LIMITE_MAPA_MS)
  })

  test(`la portada descarga como máximo ${PRESUPUESTO_PORTADA_KB} kB de JS y CSS comprimidos`, async ({
    browser,
  }) => {
    const { recursos } = await cargarPortada(browser)
    const tamanos = recursos.map((ruta) => ({
      ruta,
      kb: gzipSync(readFileSync(`${DIST}${ruta}`)).length / 1024,
    }))
    const total = tamanos.reduce((suma, t) => suma + t.kb, 0)
    for (const { ruta, kb } of tamanos) console.log(`  [rendimiento] ${ruta}: ${kb.toFixed(1)} kB`)
    console.log(`  [rendimiento] total de la portada: ${total.toFixed(1)} kB comprimidos`)

    expect(total).toBeLessThanOrEqual(PRESUPUESTO_PORTADA_KB)
  })
})
