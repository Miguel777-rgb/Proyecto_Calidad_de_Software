import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'
import { USUARIO, renderConProveedores, respuesta } from '../test-utils'

function Sonda() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <span data-testid="estado">cargando</span>
  return <span data-testid="estado">{usuario?.email ?? 'sin-sesion'}</span>
}

describe('AuthProvider', () => {
  it('sin token guardado no consulta al servidor', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderConProveedores(<Sonda />)

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('sin-sesion'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('con un token valido recupera la sesion al abrir la aplicacion', async () => {
    localStorage.setItem('ola.token', 'token-guardado')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(USUARIO)))

    renderConProveedores(<Sonda />)

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent(USUARIO.email))
  })

  it('descarta un token vencido en lugar de dejarlo en el navegador', async () => {
    // Sin esto el usuario quedaria atrapado: la interfaz lo creeria conectado
    // y cada llamada fallaria con 401.
    localStorage.setItem('ola.token', 'token-vencido')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({ detail: 'expirado' }, 401)))

    renderConProveedores(<Sonda />)

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('sin-sesion'))
    expect(localStorage.getItem('ola.token')).toBeNull()
  })

  it('envia el token guardado en la cabecera Authorization', async () => {
    localStorage.setItem('ola.token', 'token-guardado')
    const fetchMock = vi.fn().mockResolvedValue(respuesta(USUARIO))
    vi.stubGlobal('fetch', fetchMock)

    renderConProveedores(<Sonda />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const cabeceras = fetchMock.mock.calls[0][1].headers
    expect(cabeceras.Authorization).toBe('Bearer token-guardado')
  })
})
