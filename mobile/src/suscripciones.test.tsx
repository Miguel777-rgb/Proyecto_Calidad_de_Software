import { act, renderHook, waitFor } from '@testing-library/react-native'
import { LABORATORIOS } from '@ola/compartido/pruebas'
import type { ReactNode } from 'react'
import { respuesta, sesionDe, simularApi, USUARIO } from '../pruebas/utilidades'
import { ProveedorSesion, type Sesion } from './sesion'
import { ProveedorZonasSeguidas, useZonasSeguidas } from './suscripciones'

const suscripcion = (code: string) => ({
  id: 1,
  laboratory: LABORATORIOS.find((l) => l.code === code)!,
  created_at: '2026-09-27T00:00:00Z',
})

function conSesion(sesion: Sesion) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return (
      <ProveedorSesion valor={sesion}>
        <ProveedorZonasSeguidas>{children}</ProveedorZonasSeguidas>
      </ProveedorSesion>
    )
  }
}

describe('zonas seguidas', () => {
  it('sin sesion no pide nada', async () => {
    const fetchSimulado = simularApi({})
    const { result } = await renderHook(() => useZonasSeguidas(), {
      wrapper: conSesion(sesionDe(null)),
    })

    expect(result.current.estado).toBe('sin-sesion')
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('con sesion carga las zonas que sigue la persona', async () => {
    simularApi({ '/subscriptions': respuesta([suscripcion('CALLAO'), suscripcion('PAITA')]) })
    const { result } = await renderHook(() => useZonasSeguidas(), {
      wrapper: conSesion(sesionDe(USUARIO)),
    })

    await waitFor(() => expect(result.current.estado).toBe('lista'))
    expect([...result.current.seguidas].sort()).toEqual(['CALLAO', 'PAITA'])
  })

  it('seguir una zona la suscribe y dejarla da de baja', async () => {
    const fetchSimulado = simularApi({
      '/subscriptions': [respuesta([]), respuesta(suscripcion('ILO'), 201)],
      '/subscriptions/ILO': respuesta(null, 204),
    })
    const { result } = await renderHook(() => useZonasSeguidas(), {
      wrapper: conSesion(sesionDe(USUARIO)),
    })
    await waitFor(() => expect(result.current.estado).toBe('lista'))

    await act(async () => result.current.alternar('ILO'))
    expect(result.current.seguidas.has('ILO')).toBe(true)

    await act(async () => result.current.alternar('ILO'))
    expect(result.current.seguidas.has('ILO')).toBe(false)

    const metodos = fetchSimulado.mock.calls.map(([url, init]) => [
      new URL(url as string).pathname,
      (init as RequestInit | undefined)?.method ?? 'GET',
    ])
    expect(metodos).toEqual([
      ['/api/subscriptions', 'GET'],
      ['/api/subscriptions', 'POST'],
      ['/api/subscriptions/ILO', 'DELETE'],
    ])
  })

  it('si cambiar una zona falla, lo dice y no la cambia', async () => {
    simularApi({
      '/subscriptions': [respuesta([]), respuesta({ detail: 'No existe un laboratorio con el código X.' }, 404)],
    })
    const { result } = await renderHook(() => useZonasSeguidas(), {
      wrapper: conSesion(sesionDe(USUARIO)),
    })
    await waitFor(() => expect(result.current.estado).toBe('lista'))

    await act(async () => result.current.alternar('CALLAO'))

    expect(result.current.seguidas.has('CALLAO')).toBe(false)
    expect(result.current.error).toBe('No existe un laboratorio con el código X.')
    expect(result.current.ocupada).toBeNull()
  })

  it('si no se pudieron cargar, se puede reintentar', async () => {
    simularApi({
      '/subscriptions': [new TypeError('Network request failed'), respuesta([suscripcion('HUACHO')])],
    })
    const { result } = await renderHook(() => useZonasSeguidas(), {
      wrapper: conSesion(sesionDe(USUARIO)),
    })
    await waitFor(() => expect(result.current.estado).toBe('error'))

    await act(async () => result.current.recargar())

    await waitFor(() => expect(result.current.estado).toBe('lista'))
    expect(result.current.seguidas.has('HUACHO')).toBe(true)
  })

  it('al cerrar la sesion se olvidan', async () => {
    simularApi({ '/subscriptions': respuesta([suscripcion('CALLAO')]) })
    let sesion = sesionDe(USUARIO)
    function Envoltorio({ children }: { children: ReactNode }) {
      return (
        <ProveedorSesion valor={sesion}>
          <ProveedorZonasSeguidas>{children}</ProveedorZonasSeguidas>
        </ProveedorSesion>
      )
    }
    const { result, rerender } = await renderHook(() => useZonasSeguidas(), { wrapper: Envoltorio })
    await waitFor(() => expect(result.current.seguidas.has('CALLAO')).toBe(true))

    sesion = sesionDe(null)
    await rerender({})

    expect(result.current.estado).toBe('sin-sesion')
    expect(result.current.seguidas.size).toBe(0)
  })
})
