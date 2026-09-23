import { reiniciarHitos } from '../src/hitos'

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

beforeEach(() => {
  reiniciarHitos()
  // Los hitos de rendimiento van al registro del sistema; en las pruebas solo
  // ensucian la salida. La prueba que los verifica los espia por su cuenta.
  jest.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})
