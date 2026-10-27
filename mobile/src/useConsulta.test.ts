import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useConsulta } from './useConsulta'

/** Una promesa que se resuelve cuando la prueba decide. */
function diferida<T>() {
  let resolver: (valor: T) => void = () => {}
  const promesa = new Promise<T>((r) => (resolver = r))
  return { promesa, resolver }
}

describe('useConsulta', () => {
  it('pasa de cargando a lista con los datos', async () => {
    const pendiente = diferida<number>()
    const { result } = await renderHook(() => useConsulta(() => pendiente.promesa))

    expect(result.current.estado).toEqual({ fase: 'cargando' })
    await act(async () => pendiente.resolver(42))
    expect(result.current.estado).toEqual({ fase: 'lista', datos: 42 })
  })

  it('un fallo queda como error con su mensaje', async () => {
    const pedir = () => Promise.reject(new Error('sin red'))
    const { result } = await renderHook(() => useConsulta(pedir))

    await waitFor(() => expect(result.current.estado).toEqual({ fase: 'error', mensaje: 'sin red' }))
  })

  it('una respuesta tardia de un intento anterior no pisa la del reintento (D-05)', async () => {
    const primera = diferida<string>()
    const segunda = diferida<string>()
    const respuestas = [primera, segunda]
    const pedir = jest.fn(() => respuestas.shift()!.promesa)
    const { result } = await renderHook(() => useConsulta(pedir))

    await act(async () => result.current.reintentar())
    await act(async () => segunda.resolver('nueva'))
    await act(async () => primera.resolver('vieja'))

    expect(pedir).toHaveBeenCalledTimes(2)
    expect(result.current.estado).toEqual({ fase: 'lista', datos: 'nueva' })
  })

  it('una respuesta que llega despues de cerrar la pantalla se descarta', async () => {
    const pendiente = diferida<number>()
    const { result, unmount } = await renderHook(() => useConsulta(() => pendiente.promesa))

    await unmount()
    await act(async () => pendiente.resolver(1))

    expect(result.current.estado).toEqual({ fase: 'cargando' })
  })
})
