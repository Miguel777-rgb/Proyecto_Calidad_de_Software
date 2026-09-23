/**
 * Utilidades compartidas por los scripts que tocan el celular o compilan.
 * Solo Node, sin dependencias: corren igual en Windows, macOS y Linux.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const RAIZ = join(import.meta.dirname, '..')
export const PAQUETE_PRUEBAS = 'pe.ola.app'

const WINDOWS = process.platform === 'win32'

function sdk() {
  const ruta =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    (WINDOWS ? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk') : join(process.env.HOME ?? '', 'Android', 'Sdk'))
  if (!existsSync(ruta)) {
    throw new Error(`No se encontro el Android SDK en ${ruta}. Define ANDROID_HOME.`)
  }
  return ruta
}

export const ADB = join(sdk(), 'platform-tools', WINDOWS ? 'adb.exe' : 'adb')

/** Ejecuta un comando y devuelve su salida; si falla, detiene el script. */
export function ejecutar(comando, argumentos, opciones = {}) {
  const resultado = spawnSync(comando, argumentos, {
    encoding: 'utf8',
    shell: WINDOWS && !comando.endsWith('.exe'),
    stdio: opciones.heredar ? 'inherit' : 'pipe',
    cwd: opciones.cwd ?? RAIZ,
    env: { ...process.env, ...opciones.entorno },
    timeout: opciones.limiteMs,
  })
  if (resultado.error) throw resultado.error
  if (resultado.status !== 0 && !opciones.tolerarFallo) {
    const detalle = opciones.heredar ? '' : `\n${resultado.stdout ?? ''}${resultado.stderr ?? ''}`
    throw new Error(`Fallo: ${comando} ${argumentos.join(' ')} (codigo ${resultado.status})${detalle}`)
  }
  return { codigo: resultado.status, salida: (resultado.stdout ?? '').trim() }
}

export const adb = (...argumentos) => ejecutar(ADB, argumentos).salida

/** El unico celular o emulador conectado y autorizado. */
export function dispositivo() {
  const lineas = adb('devices')
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((partes) => partes.length >= 2)
  const listos = lineas.filter(([, estado]) => estado === 'device')
  if (listos.length === 0) {
    const pendiente = lineas.find(([, estado]) => estado === 'unauthorized')
    throw new Error(
      pendiente
        ? 'El celular esta conectado pero sin autorizar: acepta «Permitir depuracion USB» en su pantalla.'
        : 'No hay ningun celular ni emulador conectado por adb.',
    )
  }
  if (listos.length > 1) throw new Error('Hay mas de un dispositivo conectado; deja solo uno.')
  return listos[0][0]
}

/**
 * El celular ve la API del equipo (puerto 8000) en su localhost:18000, a traves
 * del cable USB. El puerto del celular debe coincidir con PUERTO_API_CELULAR de
 * app.config.ts.
 */
export const PUERTO_API_CELULAR = 18000

export function conectarApi() {
  adb('reverse', `tcp:${PUERTO_API_CELULAR}`, 'tcp:8000')
}

export function desconectarApi() {
  adb('reverse', '--remove', `tcp:${PUERTO_API_CELULAR}`)
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
