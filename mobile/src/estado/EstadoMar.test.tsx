import { act, renderHook, waitFor } from '@testing-library/react-native'
import { ESTADO_MUESTRA, ESTADO_VACIO } from '@ola/compartido/pruebas'
import type { ReactNode } from 'react'
import { emitirRed } from '../../pruebas/simulaciones/netinfo'
import {
  CONFIGURACION,
  respuesta,
  respuestaPendiente,
  SIN_RED,
  simularApi,
} from '../../pruebas/utilidades'
import { ProveedorEstadoMar, useEstadoMar, VIGENCIA_POR_DEFECTO, type EstadoMar } from './EstadoMar'
import { guardarEstado, leerEstadoGuardado } from './guardado'

const GUARDADO_EN = new Date(2026, 8, 23, 8, 46).getTime()

function conProveedor({ children }: { children: ReactNode }) {
  return <ProveedorEstadoMar>{children}</ProveedorEstadoMar>
}

async function abrir() {
  return renderHook(() => useEstadoMar(), { wrapper: conProveedor })
}

type Lista = Extract<EstadoMar, { fase: 'lista' }>

function lista(estado: EstadoMar): Lista {
  if (estado.fase !== 'lista') throw new Error(`Se esperaba la fase lista y es ${estado.fase}`)
  return estado
}

async function guardarMuestra() {
  await guardarEstado({ estado: ESTADO_VACIO, configuracion: null, guardadoEn: GUARDADO_EN })
}

describe('estado del mar', () => {
  it('sin nada guardado espera a la API y guarda lo que llega', async () => {
    simularApi({ '/status': respuesta(ESTADO_MUESTRA), '/settings': respuesta(CONFIGURACION) })
    const { result } = await abrir()

    await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))
    const actual = lista(result.current.estadoMar)
    expect(actual.origen).toBe('red')
    expect(actual.sinConexion).toBe(false)
    expect(actual.datos).toEqual({ estado: ESTADO_MUESTRA, ventana: 5, vigencia: 7 })
    await waitFor(async () =>
      expect((await leerEstadoGuardado())?.estado).toEqual(ESTADO_MUESTRA),
    )
  })

  it('con datos guardados los muestra al instante y luego pone los de la API', async () => {
    await guardarMuestra()
    const estado = respuestaPendiente()
    simularApi({ '/status': estado.promesa, '/settings': respuesta(CONFIGURACION) })
    const { result } = await abrir()

    await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))
    expect(lista(result.current.estadoMar)).toMatchObject({
      origen: 'guardado',
      guardadoEn: GUARDADO_EN,
      sinConexion: false,
    })

    await act(async () => estado.responder(respuesta(ESTADO_MUESTRA)))

    await waitFor(() => expect(lista(result.current.estadoMar).origen).toBe('red'))
    expect(lista(result.current.estadoMar).datos.estado).toEqual(ESTADO_MUESTRA)
  })

  it('sin conexion y con datos guardados se queda con ellos y lo dice', async () => {
    await guardarMuestra()
    simularApi({ '/status': SIN_RED, '/settings': SIN_RED })
    const { result } = await abrir()

    await waitFor(() => expect(lista(result.current.estadoMar).sinConexion).toBe(true))
    expect(lista(result.current.estadoMar)).toMatchObject({
      origen: 'guardado',
      guardadoEn: GUARDADO_EN,
    })
  })

  it('sin conexion y sin datos guardados es un error, y reintentar lo recupera', async () => {
    simularApi({ '/status': [SIN_RED, respuesta(ESTADO_MUESTRA)], '/settings': respuesta(CONFIGURACION) })
    const { result } = await abrir()

    await waitFor(() => expect(result.current.estadoMar.fase).toBe('error'))

    await act(async () => result.current.actualizar())

    await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))
  })

  it('reintentar desde el error vuelve a mostrar la carga', async () => {
    const segunda = respuestaPendiente()
    simularApi({ '/status': [SIN_RED, segunda.promesa], '/settings': respuesta(CONFIGURACION) })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.estadoMar.fase).toBe('error'))

    await act(async () => result.current.actualizar())

    expect(result.current.estadoMar.fase).toBe('cargando')
    await act(async () => segunda.responder(respuesta(ESTADO_MUESTRA)))
    await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))
  })

  it('sin configuracion usa la vigencia por defecto y no inventa la ventana', async () => {
    simularApi({ '/status': respuesta(ESTADO_MUESTRA), '/settings': SIN_RED })
    const { result } = await abrir()

    await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))
    expect(lista(result.current.estadoMar).datos).toMatchObject({
      ventana: null,
      vigencia: VIGENCIA_POR_DEFECTO,
    })
  })

  it('actualizar conserva lo que se ve mientras llega lo nuevo', async () => {
    const segunda = respuestaPendiente()
    simularApi({
      '/status': [respuesta(ESTADO_VACIO), segunda.promesa],
      '/settings': respuesta(CONFIGURACION),
    })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))

    await act(async () => result.current.actualizar())

    expect(lista(result.current.estadoMar)).toMatchObject({ actualizando: true })
    expect(lista(result.current.estadoMar).datos.estado).toEqual(ESTADO_VACIO)

    await act(async () => segunda.responder(respuesta(ESTADO_MUESTRA)))
    await waitFor(() => expect(lista(result.current.estadoMar).actualizando).toBe(false))
    expect(lista(result.current.estadoMar).datos.estado).toEqual(ESTADO_MUESTRA)
  })

  it('si actualizar falla, se conserva lo que se veia y se avisa', async () => {
    simularApi({
      '/status': [respuesta(ESTADO_MUESTRA), SIN_RED],
      '/settings': respuesta(CONFIGURACION),
    })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))

    await act(async () => result.current.actualizar())

    await waitFor(() => expect(lista(result.current.estadoMar).sinConexion).toBe(true))
    expect(lista(result.current.estadoMar)).toMatchObject({ origen: 'red', actualizando: false })
    expect(lista(result.current.estadoMar).datos.estado).toEqual(ESTADO_MUESTRA)
  })

  it('una respuesta vieja que llega tarde no pisa a la nueva (D-05)', async () => {
    const vieja = respuestaPendiente()
    simularApi({
      '/status': [vieja.promesa, respuesta(ESTADO_MUESTRA)],
      '/settings': respuesta(CONFIGURACION),
    })
    const { result } = await abrir()

    await act(async () => result.current.actualizar())
    await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))

    await act(async () => vieja.responder(respuesta(ESTADO_VACIO)))

    expect(lista(result.current.estadoMar).datos.estado).toEqual(ESTADO_MUESTRA)
  })

  describe('al volver la red', () => {
    it('actualiza solo si lo que se veia era lo guardado', async () => {
      await guardarMuestra()
      const fetchSimulado = simularApi({
        '/status': [SIN_RED, respuesta(ESTADO_MUESTRA)],
        '/settings': respuesta(CONFIGURACION),
      })
      const { result } = await abrir()
      await waitFor(() => expect(lista(result.current.estadoMar).sinConexion).toBe(true))

      await act(async () => emitirRed({ isConnected: false, isInternetReachable: false }))
      await act(async () => emitirRed({ isConnected: true, isInternetReachable: true }))

      await waitFor(() => expect(lista(result.current.estadoMar).sinConexion).toBe(false))
      expect(lista(result.current.estadoMar).origen).toBe('red')
      expect(fetchSimulado).toHaveBeenCalledTimes(4)
    })

    it('tambien sale del error sin que la persona lo pida', async () => {
      simularApi({ '/status': [SIN_RED, respuesta(ESTADO_MUESTRA)], '/settings': respuesta(CONFIGURACION) })
      const { result } = await abrir()
      await waitFor(() => expect(result.current.estadoMar.fase).toBe('error'))

      await act(async () => emitirRed({ isConnected: false, isInternetReachable: null }))
      await act(async () => emitirRed({ isConnected: true, isInternetReachable: null }))

      await waitFor(() => expect(result.current.estadoMar.fase).toBe('lista'))
    })

    it('no pide nada si los datos ya estaban al dia', async () => {
      const fetchSimulado = simularApi({
        '/status': respuesta(ESTADO_MUESTRA),
        '/settings': respuesta(CONFIGURACION),
      })
      const { result } = await abrir()
      await waitFor(() => expect(lista(result.current.estadoMar).origen).toBe('red'))

      await act(async () => emitirRed({ isConnected: false, isInternetReachable: false }))
      await act(async () => emitirRed({ isConnected: true, isInternetReachable: true }))

      expect(fetchSimulado).toHaveBeenCalledTimes(2)
    })

    it('el primer aviso de la red al abrir no cuenta como reconexion', async () => {
      simularApi({ '/status': [SIN_RED, respuesta(ESTADO_MUESTRA)], '/settings': respuesta(CONFIGURACION) })
      const { result } = await abrir()
      await waitFor(() => expect(result.current.estadoMar.fase).toBe('error'))

      await act(async () => emitirRed({ isConnected: true, isInternetReachable: true }))

      expect(result.current.estadoMar.fase).toBe('error')
    })
  })

  it('fuera del proveedor avisa del error de programacion', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(renderHook(() => useEstadoMar())).rejects.toThrow(/ProveedorEstadoMar/)
  })
})
