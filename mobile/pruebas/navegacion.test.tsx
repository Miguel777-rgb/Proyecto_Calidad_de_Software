import { ESTADO_MUESTRA } from '@ola/compartido/pruebas'
import { Slot } from 'expo-router'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import LayoutPestanas from '../src/app/(tabs)/_layout'
import Comparar from '../src/app/(tabs)/comparar'
import Historico from '../src/app/(tabs)/historico'
import Mapa from '../src/app/(tabs)/index'
import Proyeccion from '../src/app/(tabs)/proyeccion'
import Avisos from '../src/app/avisos'
import Entrar from '../src/app/entrar'
import MisZonas from '../src/app/mis-zonas'
import { ProveedorSesion } from '../src/sesion'
import { respuesta, sesionDe, simularFetch, USUARIO } from './utilidades'

/** Las rutas reales de la app, con sus layouts y pantallas. */
const RUTAS = {
  '(tabs)/_layout': LayoutPestanas,
  '(tabs)/index': Mapa,
  '(tabs)/historico': Historico,
  '(tabs)/comparar': Comparar,
  '(tabs)/proyeccion': Proyeccion,
  entrar: Entrar,
  'mis-zonas': MisZonas,
  avisos: Avisos,
}

/**
 * Abre la app en una ruta. Con el render asincrono de Testing Library 14, la
 * ruta actual se lee del resultado de renderRouter y no de `screen`.
 */
async function abrir(initialUrl: string, rutas: Parameters<typeof renderRouter>[0] = RUTAS) {
  const app = renderRouter(rutas, { initialUrl })
  await app
  return { ruta: () => app.getPathname() }
}

beforeEach(() => {
  simularFetch(respuesta(ESTADO_MUESTRA))
})

describe('navegacion', () => {
  it('la app arranca en el mapa con la pestana Mapa seleccionada', async () => {
    const app = await abrir('/')

    expect(app.ruta()).toBe('/')
    expect(await screen.findByTestId('fecha-referencia')).toBeOnTheScreen()
    expect(screen.getByRole('tab', { name: 'Mapa', selected: true })).toBeOnTheScreen()
  })

  it.each([
    ['Histórico', '/historico', 'El histórico de cada zona llega en la próxima versión de la app.'],
    ['Comparar', '/comparar', 'La comparación entre zonas llega en la próxima versión de la app.'],
    ['Próximos días', '/proyeccion', 'Los próximos días de cada zona llegan en la próxima versión de la app.'],
  ])('la pestana %s lleva a %s y queda seleccionada', async (pestana, ruta, provisional) => {
    const app = await abrir('/')
    await screen.findByTestId('fecha-referencia')

    await fireEvent.press(screen.getByRole('tab', { name: pestana }))

    expect(app.ruta()).toBe(ruta)
    expect(await screen.findByText(provisional)).toBeOnTheScreen()
    expect(screen.getByRole('tab', { name: pestana, selected: true })).toBeOnTheScreen()
  })

  it('cada pestana termina con la atribucion obligatoria a IMARPE', async () => {
    await abrir('/proyeccion')

    expect(await screen.findByTestId('atribucion')).toHaveTextContent(/IMARPE/)
  })

  it('Entrar abre la pantalla de inicio de sesion', async () => {
    const app = await abrir('/')
    await screen.findByTestId('fecha-referencia')

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }))

    expect(app.ruta()).toBe('/entrar')
    expect(
      await screen.findByText('Iniciar sesión llega en la próxima versión de la app.'),
    ).toBeOnTheScreen()
  })

  it('desde la hoja de cuenta se llega a los avisos', async () => {
    const app = await abrir('/', {
      ...RUTAS,
      _layout: () => (
        <ProveedorSesion valor={sesionDe(USUARIO, 2)}>
          <Slot />
        </ProveedorSesion>
      ),
    })
    await screen.findByTestId('fecha-referencia')

    await fireEvent.press(screen.getByRole('button', { name: 'Menú de cuenta, 2 avisos sin leer' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Avisos, 2 sin leer' }))

    expect(app.ruta()).toBe('/avisos')
  })
})
