import AsyncStorage from '@react-native-async-storage/async-storage'
import { reiniciarHitos } from '../src/hitos'
import { reiniciarRed } from './simulaciones/netinfo'

// jest-expo no ejecuta app.config.ts: se le entrega a expo-constants lo que
// dejaria en `extra` la variante e2e, para que las pruebas usen la misma
// configuracion que el APK que prueba Maestro.
jest.mock('expo-constants', () => {
  const real = jest.requireActual('expo-constants')
  const construirConfig = jest.requireActual('../app.config').default
  const anterior = process.env.APP_VARIANT
  process.env.APP_VARIANT = 'e2e'
  const { extra } = construirConfig({ config: {} })
  if (anterior === undefined) delete process.env.APP_VARIANT
  else process.env.APP_VARIANT = anterior
  const constantes = real.default ?? real
  return {
    __esModule: true,
    ...real,
    default: { ...constantes, expoConfig: { ...constantes.expoConfig, extra } },
  }
})

// Los insets del celular (hora arriba, gestos abajo) en valores fijos: las
// pruebas no dependen de un equipo concreto.
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
)

// Modulos nativos sin version para Jest: el almacenamiento en memoria que
// publica AsyncStorage y simulaciones propias del mapa y de la red.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@react-native-community/netinfo', () => jest.requireActual('./simulaciones/netinfo'))
jest.mock('@maplibre/maplibre-react-native', () => jest.requireActual('./simulaciones/maplibre'))

beforeEach(async () => {
  reiniciarHitos()
  reiniciarRed()
  // Cada prueba empieza sin datos guardados, como una instalacion nueva.
  await AsyncStorage.clear()
  // Los hitos de rendimiento van al registro del sistema; en las pruebas solo
  // ensucian la salida. La prueba que los verifica los espia por su cuenta.
  jest.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})
