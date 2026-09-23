import { fireEvent, render, screen } from '@testing-library/react-native'
import { ESTADO_MUESTRA, ESTADO_VACIO } from '@ola/compartido/pruebas'
import Mapa from '../src/app/(tabs)/index'
import { respuesta, simularFetch } from './utilidades'

describe('Mapa (fase 1)', () => {
  it('mientras llega el estado lo anuncia', async () => {
    let responder: (r: Response) => void = () => {}
    global.fetch = jest.fn(() => new Promise<Response>((r) => (responder = r))) as typeof fetch
    await render(<Mapa />)

    expect(screen.getByText('Cargando el estado del mar')).toBeOnTheScreen()
    responder(respuesta(ESTADO_MUESTRA))
    expect(await screen.findByTestId('fecha-referencia')).toBeOnTheScreen()
  })

  it('muestra la fecha del dato como dd/mm/aaaa, sin desfase horario', async () => {
    simularFetch(respuesta(ESTADO_MUESTRA))
    await render(<Mapa />)

    expect(await screen.findByTestId('fecha-referencia')).toHaveTextContent(
      'Datos del mar al 31/07/2026',
    )
  })

  it('pide el estado a la API con la que se compilo la app', async () => {
    const fetchSimulado = simularFetch(respuesta(ESTADO_MUESTRA))
    await render(<Mapa />)

    await screen.findByTestId('fecha-referencia')
    expect(fetchSimulado).toHaveBeenCalledWith('http://localhost:18000/api/status', expect.anything())
  })

  it('sin datos cargados lo explica en lugar de mostrar una fecha vacia', async () => {
    simularFetch(respuesta(ESTADO_VACIO))
    await render(<Mapa />)

    expect(await screen.findByTestId('sin-datos')).toHaveTextContent(/Aún no hay datos del mar\./)
    expect(screen.queryByTestId('fecha-referencia')).toBeNull()
  })

  it('si la API no responde ofrece reintentar, y al reintentar se recupera', async () => {
    simularFetch(new TypeError('Network request failed'), respuesta(ESTADO_MUESTRA))
    await render(<Mapa />)

    expect(await screen.findByText('No pudimos cargar el estado del mar.')).toBeOnTheScreen()
    expect(screen.getByText('Revisa tu conexión.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByTestId('fecha-referencia')).toBeOnTheScreen()
    expect(screen.queryByTestId('error-conexion')).toBeNull()
  })

  it('un error del servidor tambien ofrece reintentar', async () => {
    simularFetch(respuesta({ detail: 'Error interno' }, 500))
    await render(<Mapa />)

    expect(await screen.findByTestId('error-conexion')).toBeOnTheScreen()
  })

  it('avisa que el mapa llega en la fase 2 y cierra con la atribucion a IMARPE', async () => {
    simularFetch(respuesta(ESTADO_MUESTRA))
    await render(<Mapa />)

    await screen.findByTestId('fecha-referencia')
    expect(
      screen.getByText('El mapa y las 10 zonas llegan en la próxima versión de la app.'),
    ).toBeOnTheScreen()
    expect(screen.getByText('Provisional · fase 2')).toBeOnTheScreen()
    expect(screen.getByTestId('atribucion')).toHaveTextContent(/IMARPE/)
  })

  it('el titulo de la pantalla es un encabezado para TalkBack', async () => {
    simularFetch(respuesta(ESTADO_MUESTRA))
    await render(<Mapa />)

    expect(await screen.findByRole('header', { name: 'Estado del mar en la costa' })).toBeOnTheScreen()
  })

  it('marca el hito de rendimiento una sola vez, cuando el estado ya se ve', async () => {
    const registro = jest.spyOn(console, 'info').mockImplementation(() => {})
    simularFetch(new TypeError('Network request failed'), respuesta(ESTADO_MUESTRA))
    await render(<Mapa />)

    await screen.findByTestId('error-conexion')
    expect(registro).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByTestId('fecha-referencia')

    expect(registro).toHaveBeenCalledTimes(1)
    expect(registro).toHaveBeenCalledWith('[ola:hito] estado-visible')
  })
})
