/**
 * Pruebas de extremo a extremo de la app con Maestro, en el celular conectado.
 *
 *   pnpm e2e                 compila el APK de pruebas, lo instala y corre todo
 *   pnpm e2e --sin-compilar  usa el APK que ya esta instalado
 *
 * Requisitos: el backend de Docker levantado (docker compose up -d), el celular
 * conectado y autorizado, y Maestro instalado.
 *
 * Algunos flujos necesitan preparar el celular desde fuera, cosa que Maestro no
 * hace: cortar el acceso a la API o subir el tamano de letra. La letra se
 * cambia entre un flujo y otro. La API se corta y se devuelve a mitad de un
 * flujo: el script escucha en 127.0.0.1:18999 y el flujo lo llama con
 * evalScript, que Maestro ejecuta en el equipo. Al terminar, el celular queda
 * como estaba.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import {
  adb,
  conectarApi,
  desconectarApi,
  dispositivo,
  ejecutar,
  PAQUETE_PRUEBAS,
  RAIZ,
} from './android.mjs'

const INFORMES = join(RAIZ, 'informes')
const ANIMACIONES = ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale']

async function apiDisponible() {
  try {
    const respuesta = await fetch('http://localhost:8000/api/health/ready')
    return respuesta.ok
  } catch {
    return false
  }
}

/** Servidor de control para los flujos: corta o devuelve el acceso a la API. */
function servidorDeControl() {
  const acciones = { '/desconectar-api': desconectarApi, '/conectar-api': conectarApi }
  const servidor = createServer((peticion, respuesta) => {
    const accion = acciones[peticion.url ?? '']
    if (peticion.method !== 'POST' || accion === undefined) {
      respuesta.writeHead(404).end()
      return
    }
    try {
      accion()
      respuesta.writeHead(204).end()
    } catch (error) {
      respuesta.writeHead(500).end(String(error))
    }
  })
  return new Promise((resolver) => servidor.listen(18999, '127.0.0.1', () => resolver(servidor)))
}

/**
 * Corre Maestro sin bloquear este proceso: mientras un flujo corre, el
 * servidor de control tiene que poder responderle.
 */
function maestro(nombre, ruta) {
  console.log(`\n▸ ${nombre}`)
  const proceso = spawn(
    'maestro',
    [
      'test',
      ruta,
      '--format',
      'junit',
      '--output',
      join(INFORMES, `maestro-${nombre}.xml`),
      '--test-output-dir',
      join(INFORMES, 'maestro'),
    ],
    { cwd: RAIZ, stdio: 'inherit', shell: process.platform === 'win32' },
  )
  return new Promise((resolver) => proceso.on('close', (codigo) => resolver(codigo === 0)))
}

async function main() {
  const serie = dispositivo()
  console.log(`Celular: ${serie}`)

  conectarApi()
  if (!(await apiDisponible())) {
    throw new Error('La API no responde en localhost:8000. Levanta el backend: docker compose up -d')
  }

  if (!process.argv.includes('--sin-compilar')) {
    ejecutar('node', ['scripts/compilar.mjs', 'e2e', '--instalar'], { heredar: true })
  } else if (!adb('shell', 'pm', 'list', 'packages', PAQUETE_PRUEBAS).includes(PAQUETE_PRUEBAS)) {
    throw new Error(`${PAQUETE_PRUEBAS} no esta instalado. Corre sin --sin-compilar.`)
  }

  mkdirSync(join(INFORMES, 'capturas'), { recursive: true })

  // Estado del celular antes de tocarlo, para devolverlo igual.
  const letraOriginal = adb('shell', 'settings', 'get', 'system', 'font_scale') || '1.0'
  const animacionesOriginales = ANIMACIONES.map((a) => adb('shell', 'settings', 'get', 'global', a))

  const resultados = {}
  const control = await servidorDeControl()
  try {
    // Sin animaciones del sistema los flujos no esperan transiciones.
    for (const a of ANIMACIONES) adb('shell', 'settings', 'put', 'global', a, '0')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')

    resultados.marco = await maestro('marco', '.maestro/marco')

    resultados['sin conexion'] = await maestro('sin-conexion', '.maestro/sin-conexion')

    adb('shell', 'settings', 'put', 'system', 'font_scale', '2.0')
    resultados['letra al 200 %'] = await maestro('letra', '.maestro/letra/letra-grande.yaml')
  } finally {
    control.close()
    adb('shell', 'settings', 'put', 'system', 'font_scale', letraOriginal)
    ANIMACIONES.forEach((a, i) => {
      const valor = animacionesOriginales[i]
      if (valor === 'null' || valor === '') adb('shell', 'settings', 'delete', 'global', a)
      else adb('shell', 'settings', 'put', 'global', a, valor)
    })
    conectarApi()
  }

  console.log('\nResumen')
  for (const [grupo, ok] of Object.entries(resultados)) console.log(`  ${ok ? '✓' : '✗'} ${grupo}`)
  console.log(`Informes y capturas en ${INFORMES}`)
  if (Object.values(resultados).some((ok) => !ok)) process.exit(1)
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}`)
  process.exit(1)
})
