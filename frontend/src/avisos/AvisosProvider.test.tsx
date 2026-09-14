import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AvisosProvider } from './AvisosProvider'
import { useAvisosSinLeer } from './useAvisosSinLeer'
import {
  USUARIO,
  apiPorRuta,
  conSesionIniciada,
  renderConProveedores,
  respuesta,
} from '../test-utils'

function Contador() {
  const { sinLeer, refrescar } = useAvisosSinLeer()
  return (
    <>
      <span data-testid="contador">{sinLeer}</span>
      <button type="button" onClick={refrescar}>
        Refrescar
      </button>
      <Link to="/otra">Otra pantalla</Link>
    </>
  )
}

function montar() {
  return renderConProveedores(
    <AvisosProvider>
      <Contador />
    </AvisosProvider>,
  )
}

const pedidasDeAvisos = (mock: ReturnType<typeof vi.fn>) =>
  mock.mock.calls.filter((c) => String(c[0]).endsWith('/notifications')).length

describe('AvisosProvider', () => {
  it('sin sesion el contador vale cero y no se piden avisos', () => {
    const mock = vi.fn()
    vi.stubGlobal('fetch', mock)
    montar()

    expect(screen.getByTestId('contador')).toHaveTextContent('0')
    expect(mock).not.toHaveBeenCalled()
  })

  it('con sesion muestra los avisos sin leer del usuario', async () => {
    conSesionIniciada()
    vi.stubGlobal('fetch', apiPorRuta({ '/notifications': { unread: 3, items: [] } }))
    montar()

    await waitFor(() => expect(screen.getByTestId('contador')).toHaveTextContent('3'))
  })

  it('vuelve a pedir el contador al cambiar de pantalla', async () => {
    conSesionIniciada()
    const mock = apiPorRuta({ '/notifications': { unread: 3, items: [] } })
    vi.stubGlobal('fetch', mock)
    montar()
    await waitFor(() => expect(screen.getByTestId('contador')).toHaveTextContent('3'))
    const antes = pedidasDeAvisos(mock)

    await userEvent.setup().click(screen.getByRole('link', { name: 'Otra pantalla' }))
    await waitFor(() => expect(pedidasDeAvisos(mock)).toBeGreaterThan(antes))
  })

  it('refrescar vuelve a pedir el contador', async () => {
    conSesionIniciada()
    const mock = apiPorRuta({ '/notifications': { unread: 1, items: [] } })
    vi.stubGlobal('fetch', mock)
    montar()
    await waitFor(() => expect(screen.getByTestId('contador')).toHaveTextContent('1'))
    const antes = pedidasDeAvisos(mock)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Refrescar' }))
    await waitFor(() => expect(pedidasDeAvisos(mock)).toBeGreaterThan(antes))
  })

  it('si el servidor falla el contador queda en cero', async () => {
    conSesionIniciada()
    const mock = vi.fn(async (url: string) =>
      String(url).includes('/auth/me')
        ? respuesta(USUARIO)
        : respuesta({ detail: 'Error interno' }, 500),
    )
    vi.stubGlobal('fetch', mock)
    montar()

    await waitFor(() => expect(pedidasDeAvisos(mock)).toBeGreaterThan(0))
    expect(screen.getByTestId('contador')).toHaveTextContent('0')
  })
})
