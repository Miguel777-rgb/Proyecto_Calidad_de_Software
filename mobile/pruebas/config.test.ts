import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ExpoConfig } from 'expo/config'
import construirConfig, { PUERTO_API_CELULAR, VARIANTES, varianteActual } from '../app.config'
import { configuracion } from '../src/config'

const RAIZ = join(__dirname, '..')

function configDe(variante?: string): ExpoConfig {
  const anterior = process.env.APP_VARIANT
  if (variante === undefined) delete process.env.APP_VARIANT
  else process.env.APP_VARIANT = variante
  try {
    return construirConfig({ config: {} } as Parameters<typeof construirConfig>[0])
  } finally {
    if (anterior === undefined) delete process.env.APP_VARIANT
    else process.env.APP_VARIANT = anterior
  }
}

type Plugin = [string, Record<string, unknown>]
const opcionesDe = (config: ExpoConfig, nombre: string) =>
  (config.plugins as (string | Plugin)[]).find(
    (p): p is Plugin => Array.isArray(p) && p[0] === nombre,
  )?.[1]

const propiedadesAndroid = (config: ExpoConfig) =>
  (opcionesDe(config, 'expo-build-properties') as { android: Record<string, unknown> }).android

describe('variantes de compilacion', () => {
  it('sin APP_VARIANT compila el build de desarrollo, con paquete propio', () => {
    const config = configDe()
    expect(config.extra?.variante).toBe('desarrollo')
    expect(config.android?.package).toBe('pe.ola.app.dev')
    expect(config.name).toBe('OLA Dev')
  })

  it('las variantes e2e y demo se instalan como la app «OLA» (pe.ola.app)', () => {
    for (const variante of ['e2e', 'demo']) {
      const config = configDe(variante)
      expect(config.android?.package).toBe('pe.ola.app')
      expect(config.name).toBe('OLA')
    }
  })

  it('desarrollo y e2e hablan con el Docker del equipo a traves del cable', () => {
    for (const variante of ['desarrollo', 'e2e']) {
      const config = configDe(variante)
      expect(config.extra?.apiUrl).toBe('http://localhost:18000/api')
      expect(propiedadesAndroid(config).usesCleartextTraffic).toBe(true)
    }
  })

  it('demo apunta al VPS y no permite trafico sin cifrar', () => {
    const config = configDe('demo')
    expect(config.extra?.apiUrl).toMatch(/^https:\/\/.+\/api$/)
    expect(propiedadesAndroid(config).usesCleartextTraffic).toBe(false)
  })

  it('el APK de pruebas se compila solo para el celular; el demo, para ARM de 32 y 64 bits', () => {
    expect(propiedadesAndroid(configDe('e2e')).buildArchs).toEqual(['arm64-v8a'])
    expect(propiedadesAndroid(configDe('demo')).buildArchs).toEqual(['armeabi-v7a', 'arm64-v8a'])
    expect(propiedadesAndroid(configDe('desarrollo'))).not.toHaveProperty('buildArchs')
  })

  it('el puerto del celular es el mismo que abre scripts/android.mjs con adb reverse', () => {
    const script = readFileSync(join(RAIZ, 'scripts', 'android.mjs'), 'utf8')

    expect(script).toContain(`export const PUERTO_API_CELULAR = ${PUERTO_API_CELULAR}`)
    expect(PUERTO_API_CELULAR).not.toBe(8000)
  })

  it('rechaza una variante que no existe, en lugar de compilar a medias', () => {
    expect(() => varianteActual('produccion')).toThrow(/APP_VARIANT="produccion" no existe/)
  })

  it('todas las variantes declaradas se pueden compilar', () => {
    for (const variante of Object.keys(VARIANTES)) expect(() => configDe(variante)).not.toThrow()
  })
})

describe('configuracion comun', () => {
  const config = configDe('e2e')

  it('exige Android 10 (API 29) o superior, como fija la SRS 1.7', () => {
    expect(propiedadesAndroid(config).minSdkVersion).toBe(29)
  })

  it('solo vertical y solo tema claro', () => {
    expect(config.orientation).toBe('portrait')
    expect(config.userInterfaceStyle).toBe('light')
  })

  it('icono adaptativo con fondo abisal y version monocroma para iconos tematicos', () => {
    expect(config.android?.adaptiveIcon).toMatchObject({
      backgroundColor: '#0a2530',
      foregroundImage: expect.any(String),
      monochromeImage: expect.any(String),
    })
  })

  it('las imagenes de icono y arranque existen', () => {
    const arranque = opcionesDe(config, 'expo-splash-screen') as { image: string }
    const rutas = [
      config.icon,
      config.android?.adaptiveIcon?.foregroundImage,
      config.android?.adaptiveIcon?.monochromeImage,
      arranque.image,
    ]
    for (const ruta of rutas) expect(existsSync(join(RAIZ, ruta!))).toBe(true)
  })

  it('incrusta cada peso de fuente que usan los estilos y cada archivo existe', () => {
    const fuentes = (opcionesDe(config, 'expo-font') as {
      android: { fonts: { fontFamily: string; fontDefinitions: { path: string; weight: number }[] }[] }
    }).android.fonts
    const pesos = Object.fromEntries(
      fuentes.map((f) => [f.fontFamily, f.fontDefinitions.map((d) => d.weight)]),
    )
    expect(pesos).toEqual({
      Inter: [400, 500, 600, 700],
      SpaceGrotesk: [600, 700],
      JetBrainsMono: [500],
    })
    for (const { fontDefinitions } of fuentes) {
      for (const { path } of fontDefinitions) expect(existsSync(join(RAIZ, path))).toBe(true)
    }
  })
})

describe('configuracion()', () => {
  it('quita la barra final de la direccion de la API', () => {
    expect(configuracion({ variante: 'e2e', apiUrl: 'http://localhost:8000/api/' }).apiUrl).toBe(
      'http://localhost:8000/api',
    )
  })

  it('falla en cuanto arranca si la app se compilo sin direccion de la API', () => {
    expect(() => configuracion({})).toThrow(/sin la direccion de la API/)
  })
})
