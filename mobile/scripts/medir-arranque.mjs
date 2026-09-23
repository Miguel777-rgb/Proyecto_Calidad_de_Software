/**
 * Mide cuanto tarda la app, abierta en frio, en mostrar el estado del mar
 * (SRS 3.3: no mas de 5 s). Usa el APK que ya esta instalado.
 *
 *   pnpm medir            tres arranques en frio, informa la mediana
 *   pnpm medir --veces 5
 *
 * El tiempo va desde que Android recibe la orden de abrir la app hasta que la
 * app escribe su marca `[ola:hito] estado-visible` en el registro del sistema:
 * incluye el arranque, la consulta a la API y el primer dibujo con los datos.
 */
import { conectarApi, dispositivo, adb, esperar, PAQUETE_PRUEBAS } from './android.mjs'

const LIMITE_MS = 5000
const indice = process.argv.indexOf('--veces')
const veces = indice > 0 ? Number(process.argv[indice + 1]) : 3

/** Momento del registro en milisegundos desde 1970 (formato `logcat -v epoch`). */
const momento = (linea) => Math.round(Number(linea.trim().split(/\s+/)[0]) * 1000)

async function unArranque() {
  adb('shell', 'am', 'force-stop', PAQUETE_PRUEBAS)
  await esperar(1500)
  adb('logcat', '-c')
  const orden = adb('shell', 'am', 'start', '-W', '-n', `${PAQUETE_PRUEBAS}/.MainActivity`)
  const primerCuadro = Number(/TotalTime:\s*(\d+)/.exec(orden)?.[1] ?? NaN)

  for (let intento = 0; intento < 40; intento++) {
    const registro = adb('logcat', '-d', '-v', 'epoch', '-s', 'ReactNativeJS:I', 'ActivityTaskManager:I')
    const inicio = registro.split('\n').find((l) => l.includes('START') && l.includes(PAQUETE_PRUEBAS))
    const hito = registro.split('\n').find((l) => l.includes('[ola:hito] estado-visible'))
    if (inicio && hito) return { estado: momento(hito) - momento(inicio), primerCuadro }
    await esperar(250)
  }
  throw new Error('La app no llego a mostrar el estado en 10 s: revisa que la API responda.')
}

const mediana = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

async function main() {
  console.log(`Celular: ${dispositivo()}`)
  conectarApi()
  const medidas = []
  for (let i = 1; i <= veces; i++) {
    const m = await unArranque()
    medidas.push(m)
    console.log(`  arranque ${i}: estado visible en ${m.estado} ms (primer cuadro ${m.primerCuadro} ms)`)
  }
  const estado = mediana(medidas.map((m) => m.estado))
  const cuadro = mediana(medidas.map((m) => m.primerCuadro))
  console.log(`\nMediana: estado visible en ${estado} ms · primer cuadro en ${cuadro} ms`)
  console.log(estado <= LIMITE_MS ? `✓ dentro del limite de ${LIMITE_MS} ms` : `✗ supera ${LIMITE_MS} ms`)
  if (estado > LIMITE_MS) process.exit(1)
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}`)
  process.exit(1)
})
