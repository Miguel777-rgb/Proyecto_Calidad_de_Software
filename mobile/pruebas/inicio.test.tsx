import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library'
import { ESTADO_MUESTRA, ESTADO_VACIO } from '@ola/compartido/pruebas'
import { guardarEstado } from '../src/estado/guardado'
import { abrir } from './app'
import {
  CONFIGURACION,
  respuesta,
  respuestaPendiente,
  SIN_RED,
  simularApi,
} from './utilidades'

const GUARDADO_EN = new Date(2026, 8, 23, 8, 46).getTime()

function apiConDatos() {
  return simularApi({ '/status': respuesta(ESTADO_MUESTRA), '/settings': respuesta(CONFIGURACION) })
}

async function guardarMuestra() {
  await guardarEstado({ estado: ESTADO_MUESTRA, configuracion: CONFIGURACION, guardadoEn: GUARDADO_EN })
}

describe('pestana Mapa', () => {
  it('mientras llega el primer estado muestra su forma y lo anuncia', async () => {
    const estado = respuestaPendiente()
    simularApi({ '/status': estado.promesa, '/settings': respuesta(CONFIGURACION) })
    await abrir('/')

    expect(
      await screen.findByRole('progressbar', { name: 'Cargando el estado del mar' }),
    ).toBeOnTheScreen()

    await act(async () => estado.responder(respuesta(ESTADO_MUESTRA)))
    expect(await screen.findByTestId('fecha-referencia')).toBeOnTheScreen()
  })

  it('pide el estado y la configuracion a la API con la que se compilo la app', async () => {
    const fetchSimulado = apiConDatos()
    await abrir('/')

    await screen.findByTestId('fecha-referencia')
    const urls = fetchSimulado.mock.calls.map(([url]) => url)
    expect(urls).toEqual(
      expect.arrayContaining([
        'http://localhost:18000/api/status',
        'http://localhost:18000/api/settings',
      ]),
    )
  })

  it('muestra el resumen, un marcador y una tarjeta por zona', async () => {
    apiConDatos()
    await abrir('/')

    expect(await screen.findByTestId('fecha-referencia')).toHaveTextContent(/31\/07\/2026/)
    expect(screen.getByTestId('resumen-alertas')).toHaveTextContent(
      '1 zona en alerta: Callao (cálida)',
    )
    expect(screen.getAllByTestId(/^marcador-/)).toHaveLength(ESTADO_MUESTRA.zones.length)
    expect(screen.getAllByTestId(/^tarjeta-[A-Z]+$/)).toHaveLength(ESTADO_MUESTRA.zones.length)
  })

  it('las tarjetas empiezan por las zonas en alerta', async () => {
    apiConDatos()
    await abrir('/')

    await screen.findByTestId('tarjetas-zonas')
    expect(screen.getAllByTestId(/^tarjeta-[A-Z]+$/)[0].props.testID).toBe('tarjeta-CALLAO')
  })

  it('explica de cuantos dias sale el color de cada zona', async () => {
    apiConDatos()
    await abrir('/')

    expect(
      await screen.findByText(
        'El color de cada zona sale del promedio de los últimos 5 días, para que un solo día raro no lo cambie.',
      ),
    ).toBeOnTheScreen()
  })

  it('sin configuracion no inventa la explicacion del promedio', async () => {
    simularApi({ '/status': respuesta(ESTADO_MUESTRA), '/settings': SIN_RED })
    await abrir('/')

    await screen.findByTestId('tarjetas-zonas')
    expect(screen.queryByText(/sale del promedio/)).toBeNull()
  })

  it('sin datos cargados lo explica en lugar de mostrar un mapa vacio', async () => {
    simularApi({ '/status': respuesta(ESTADO_VACIO), '/settings': respuesta(CONFIGURACION) })
    await abrir('/')

    expect(await screen.findByTestId('sin-datos')).toHaveTextContent(/Aún no hay datos del mar\./)
    expect(screen.queryByTestId('mapa-zonas')).toBeNull()
  })

  it('si la API no responde y no hay nada guardado, ofrece reintentar y se recupera', async () => {
    simularApi({
      '/status': [SIN_RED, respuesta(ESTADO_MUESTRA)],
      '/settings': respuesta(CONFIGURACION),
    })
    await abrir('/')

    expect(await screen.findByText('No pudimos cargar el estado del mar.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByTestId('fecha-referencia')).toBeOnTheScreen()
    expect(screen.queryByTestId('error-conexion')).toBeNull()
  })

  it('un error del servidor tambien ofrece reintentar', async () => {
    simularApi({ '/status': respuesta({ detail: 'Error interno' }, 500) })
    await abrir('/')

    expect(await screen.findByTestId('error-conexion')).toBeOnTheScreen()
  })

  describe('sin conexion, con datos guardados', () => {
    it('muestra lo guardado y dice de cuando es', async () => {
      await guardarMuestra()
      simularApi({ '/status': SIN_RED, '/settings': SIN_RED })
      await abrir('/')

      expect(
        await screen.findByText('Sin conexión. Datos guardados el 23/09/2026 a las 08:46.'),
      ).toBeOnTheScreen()
      expect(screen.getByTestId('tarjeta-CALLAO')).toBeOnTheScreen()
      expect(screen.queryByTestId('error-conexion')).toBeNull()
    })

    it('al reintentar con red el aviso desaparece', async () => {
      await guardarMuestra()
      simularApi({
        '/status': [SIN_RED, respuesta(ESTADO_MUESTRA)],
        '/settings': respuesta(CONFIGURACION),
      })
      await abrir('/')
      await screen.findByTestId('aviso-guardado')

      await fireEvent.press(screen.getByTestId('reintentar-guardado'))

      await waitFor(() => expect(screen.queryByTestId('aviso-guardado')).toBeNull())
    })
  })

  it('tirar hacia abajo vuelve a pedir el estado', async () => {
    const fetchSimulado = apiConDatos()
    await abrir('/')
    await screen.findByTestId('tarjetas-zonas')
    const antes = fetchSimulado.mock.calls.length

    await act(async () => screen.getByTestId('pantalla').props.refreshControl.props.onRefresh())

    await waitFor(() => expect(fetchSimulado.mock.calls.length).toBe(antes + 2))
  })

  it('el titulo de la pantalla es un encabezado para TalkBack', async () => {
    apiConDatos()
    await abrir('/')

    expect(await screen.findByRole('header', { name: 'Estado del mar en la costa' })).toBeOnTheScreen()
  })

  it('termina con la atribucion obligatoria a IMARPE', async () => {
    apiConDatos()
    await abrir('/')

    expect(await screen.findByTestId('atribucion')).toHaveTextContent(/IMARPE/)
  })

  describe('hito de rendimiento', () => {
    it('se marca una sola vez, cuando el estado de la API ya se ve con sus marcadores', async () => {
      const registro = jest.spyOn(console, 'info').mockImplementation(() => {})
      simularApi({
        '/status': [SIN_RED, respuesta(ESTADO_MUESTRA)],
        '/settings': respuesta(CONFIGURACION),
      })
      await abrir('/')

      await screen.findByTestId('error-conexion')
      expect(registro).not.toHaveBeenCalled()

      await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
      await screen.findByTestId('mapa-zonas')

      await waitFor(() => expect(registro).toHaveBeenCalledWith('[ola:hito] estado-visible'))
      expect(registro).toHaveBeenCalledTimes(1)
    })

    it('lo guardado no cuenta: se espera a la API', async () => {
      const registro = jest.spyOn(console, 'info').mockImplementation(() => {})
      await guardarMuestra()
      const estado = respuestaPendiente()
      simularApi({ '/status': estado.promesa, '/settings': respuesta(CONFIGURACION) })
      await abrir('/')

      await screen.findByTestId('mapa-zonas')
      expect(registro).not.toHaveBeenCalled()

      await act(async () => estado.responder(respuesta(ESTADO_MUESTRA)))
      await waitFor(() => expect(registro).toHaveBeenCalledWith('[ola:hito] estado-visible'))
    })

    it('sin zonas cargadas tambien se marca, porque no hay mapa que esperar', async () => {
      const registro = jest.spyOn(console, 'info').mockImplementation(() => {})
      simularApi({ '/status': respuesta(ESTADO_VACIO), '/settings': respuesta(CONFIGURACION) })
      await abrir('/')

      await screen.findByTestId('sin-datos')
      await waitFor(() => expect(registro).toHaveBeenCalledWith('[ola:hito] estado-visible'))
    })
  })
})
