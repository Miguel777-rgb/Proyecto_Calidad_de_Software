import { ESTADO_MUESTRA } from '@ola/compartido/pruebas'
import { Slot } from 'expo-router'
import { fireEvent, screen, waitFor } from 'expo-router/testing-library'
import { ProveedorEstadoMar } from '../src/estado/EstadoMar'
import { ProveedorSesion } from '../src/sesion'
import { ProveedorZonasSeguidas } from '../src/suscripciones'
import { abrir, RUTAS } from './app'
import { CONFIGURACION, respuesta, sesionDe, simularApi, USUARIO } from './utilidades'

beforeEach(() => {
  simularApi({ '/status': respuesta(ESTADO_MUESTRA), '/settings': respuesta(CONFIGURACION) })
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
    expect(await screen.findByLabelText('Correo electrónico')).toBeOnTheScreen()
  })

  it('desde la hoja de cuenta se llega a los avisos', async () => {
    const app = await abrir('/', {
      ...RUTAS,
      _layout: () => (
        <ProveedorSesion valor={sesionDe(USUARIO, 2)}>
          <ProveedorEstadoMar>
            <ProveedorZonasSeguidas>
              <Slot />
            </ProveedorZonasSeguidas>
          </ProveedorEstadoMar>
        </ProveedorSesion>
      ),
    })
    await screen.findByTestId('fecha-referencia')

    await fireEvent.press(screen.getByRole('button', { name: 'Menú de cuenta, 2 avisos sin leer' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Avisos, 2 sin leer' }))

    expect(app.ruta()).toBe('/avisos')
  })
})

describe('detalle de una zona', () => {
  it('una tarjeta abre /zona/CALLAO y cerrar vuelve al mapa', async () => {
    const app = await abrir('/')
    await screen.findByTestId('tarjetas-zonas')

    await fireEvent.press(screen.getByTestId('tarjeta-CALLAO'))

    expect(app.ruta()).toBe('/zona/CALLAO')
    expect(await screen.findByRole('header', { name: 'Callao' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar el detalle de la zona' }))

    await waitFor(() => expect(app.ruta()).toBe('/'))
    expect(screen.queryByTestId('detalle-zona')).toBeNull()
  })

  it('un marcador abre el mismo detalle', async () => {
    const app = await abrir('/')
    await screen.findByTestId('mapa-zonas')

    await fireEvent.press(screen.getByRole('button', { name: 'Pisco: frío' }))

    expect(app.ruta()).toBe('/zona/PISCO')
    expect(await screen.findByRole('header', { name: 'Pisco' })).toBeOnTheScreen()
  })

  it('al volver del detalle ninguna zona queda elegida', async () => {
    const app = await abrir('/')
    await screen.findByTestId('mapa-zonas')

    await fireEvent.press(screen.getByRole('button', { name: 'Pisco: frío' }))
    await screen.findByTestId('detalle-zona')
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar el detalle de la zona' }))
    await waitFor(() => expect(app.ruta()).toBe('/'))

    expect(screen.getByRole('button', { name: 'Pisco: frío' })).not.toBeSelected()
  })

  it('«Ver histórico» lleva a la pestana Histórico', async () => {
    const app = await abrir('/zona/HUACHO')

    await fireEvent.press(await screen.findByRole('button', { name: 'Ver histórico de Huacho' }))

    await waitFor(() => expect(app.ruta()).toBe('/historico'))
  })

  it('«Entra para recibir avisos» lleva a Entrar', async () => {
    const app = await abrir('/zona/CALLAO')

    await fireEvent.press(await screen.findByRole('button', { name: 'Entra para recibir avisos' }))

    await waitFor(() => expect(app.ruta()).toBe('/entrar'))
  })

  it('abierto directamente, como desde una notificacion, cerrar lleva al mapa', async () => {
    const app = await abrir('/zona/CALLAO')
    expect(await screen.findByRole('header', { name: 'Callao' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar el detalle de la zona' }))

    await waitFor(() => expect(app.ruta()).toBe('/'))
  })

  it('una zona que no existe lo dice y ofrece volver al mapa', async () => {
    const app = await abrir('/zona/ATLANTIDA')

    expect(await screen.findByText('No encontramos esa zona.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Volver al mapa' }))

    await waitFor(() => expect(app.ruta()).toBe('/'))
  })
})
