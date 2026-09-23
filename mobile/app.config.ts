import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Variantes de compilacion. Se elige con APP_VARIANT al compilar:
 *
 *   desarrollo  build de desarrollo con recarga en caliente. Paquete propio
 *               para convivir en el celular con la version de pruebas.
 *   e2e         APK de release que prueba Maestro. Habla con el Docker del
 *               equipo a traves del cable (adb reverse), por eso usa HTTP.
 *   demo        APK de release contra el VPS, solo por HTTPS.
 *
 * La direccion de la API queda escrita dentro del APK: cambiarla exige
 * compilar de nuevo, igual que VITE_API_URL en la web.
 */
/**
 * Puerto del celular que adb reverse lleva a la API del equipo (8000). No es el
 * 8000: en el celular de pruebas otra app ya lo usaba y adb reverse no podia
 * ocuparlo. Uno poco comun evita el choque en cualquier celular.
 */
export const PUERTO_API_CELULAR = 18000

export const VARIANTES = {
  desarrollo: {
    nombre: 'OLA Dev',
    paquete: 'pe.ola.app.dev',
    apiUrl: `http://localhost:${PUERTO_API_CELULAR}/api`,
    permiteHttp: true,
    // Todas: el build de desarrollo tambien puede correr en un emulador.
    arquitecturas: undefined,
  },
  e2e: {
    nombre: 'OLA',
    paquete: 'pe.ola.app',
    apiUrl: `http://localhost:${PUERTO_API_CELULAR}/api`,
    permiteHttp: true,
    // Solo la del celular de pruebas: compila en una fraccion del tiempo.
    arquitecturas: ['arm64-v8a'],
  },
  demo: {
    nombre: 'OLA',
    paquete: 'pe.ola.app',
    apiUrl: process.env.OLA_DEMO_API_URL ?? 'https://olachilindrina.wayrasimi.tech/api',
    permiteHttp: false,
    // ARM de 64 y de 32 bits: muchos celulares economicos con Android 10+
    // siguen siendo de 32 bits.
    arquitecturas: ['armeabi-v7a', 'arm64-v8a'],
  },
} as const

export type Variante = keyof typeof VARIANTES

export function varianteActual(valor = process.env.APP_VARIANT ?? 'desarrollo'): Variante {
  if (!(valor in VARIANTES)) {
    throw new Error(
      `APP_VARIANT="${valor}" no existe. Usa una de: ${Object.keys(VARIANTES).join(', ')}.`,
    )
  }
  return valor as Variante
}

const ABISAL = '#0a2530'
const ESPUMA = '#f3f7f5'

const fuente = (familia: string, carpeta: string, archivo: string) =>
  `node_modules/@expo-google-fonts/${familia}/${carpeta}/${archivo}.ttf`

/**
 * Fuentes incrustadas al compilar, sin descarga ni carga en tiempo de
 * ejecucion: el primer cuadro ya se dibuja con la tipografia correcta. En
 * Android cada familia agrupa sus pesos, asi que en los estilos basta con
 * `fontFamily: 'Inter'` y `fontWeight`.
 */
const FUENTES = [
  {
    fontFamily: 'Inter',
    fontDefinitions: [
      { path: fuente('inter', '400Regular', 'Inter_400Regular'), weight: 400 },
      { path: fuente('inter', '500Medium', 'Inter_500Medium'), weight: 500 },
      { path: fuente('inter', '600SemiBold', 'Inter_600SemiBold'), weight: 600 },
      { path: fuente('inter', '700Bold', 'Inter_700Bold'), weight: 700 },
    ],
  },
  {
    fontFamily: 'SpaceGrotesk',
    fontDefinitions: [
      { path: fuente('space-grotesk', '600SemiBold', 'SpaceGrotesk_600SemiBold'), weight: 600 },
      { path: fuente('space-grotesk', '700Bold', 'SpaceGrotesk_700Bold'), weight: 700 },
    ],
  },
  {
    fontFamily: 'JetBrainsMono',
    fontDefinitions: [
      { path: fuente('jetbrains-mono', '500Medium', 'JetBrainsMono_500Medium'), weight: 500 },
    ],
  },
]

export default ({ config }: ConfigContext): ExpoConfig => {
  const variante = varianteActual()
  const { nombre, paquete, apiUrl, permiteHttp, arquitecturas } = VARIANTES[variante]

  return {
    ...config,
    name: nombre,
    slug: 'ola',
    scheme: 'ola',
    version: '0.1.0',
    // Solo vertical y solo tema claro: decisiones de la maqueta de la fase 1.
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    backgroundColor: ESPUMA,
    android: {
      package: paquete,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        monochromeImage: './assets/android-icon-monochrome.png',
        backgroundColor: ABISAL,
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 220,
          backgroundColor: ABISAL,
        },
      ],
      ['expo-font', { android: { fonts: FUENTES } }],
      [
        'expo-build-properties',
        {
          android: {
            // Android 10 (API 29), decidido en la fase 0 (SRS 1.7, seccion 3.4).
            minSdkVersion: 29,
            usesCleartextTraffic: permiteHttp,
            ...(arquitecturas ? { buildArchs: [...arquitecturas] } : {}),
          },
        },
      ],
      // Compilacion C++ con rutas largas en Windows (ver el propio plugin).
      './plugins/compilacion-nativa-windows',
    ],
    experiments: { typedRoutes: true },
    extra: { variante, apiUrl },
  }
}
