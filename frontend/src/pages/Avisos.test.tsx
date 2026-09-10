import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Avisos from './Avisos'
import type { Aviso } from '../api/client'
import { textos } from '../i18n/textos'
import { USUARIO, conSesionIniciada, renderConProveedores, respuesta } from '../test-utils'

const aviso = (cambios: Partial<Aviso> = {}): Aviso => ({
  id: 1,
  laboratory_code: 'CALLAO',
  laboratory_name: 'Callao',
  kind: 'opened',
  alert_state: 'warm',
  started_on: '2026-04-16',
  ended_on: '2026-07-31',
  streak_length: 107,
  created_at: '2026-09-10T00:00:00Z',
  read_at: null,
  ...cambios,
})

function simularApi(items: Aviso[]) {
  const sinLeer = items.filter((a) => a.read_at === null).length
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    const ruta = String(url)
    if (ruta.includes('/auth/me')) return respuesta(USUARIO)
    if (init?.method === 'POST') return respuesta(null, 204)
    return respuesta({ unread: sinLeer, items })
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('Avisos', () => {
  beforeEach(() => {
    conSesionIniciada()
  })

  it('avisa cuando no hay ninguno', async () => {
    simularApi([])
    renderConProveedores(<Avisos />)
    expect(await screen.findByTestId('sin-avisos')).toBeInTheDocument()
  })

  it('describe una alerta que se abrio', async () => {
    simularApi([aviso()])
    renderConProveedores(<Avisos />)

    const lista = await screen.findByTestId('lista-avisos')
    expect(lista).toHaveTextContent('Callao entró en alerta cálida')
    expect(lista).toHaveTextContent('2026-04-16')
  })

  it('describe una alerta que termino', async () => {
    simularApi([aviso({ kind: 'closed', alert_state: 'cold' })])
    renderConProveedores(<Avisos />)

    expect(await screen.findByTestId('lista-avisos')).toHaveTextContent(
      'Terminó la alerta fría en Callao',
    )
  })

  it('cuenta los avisos sin leer', async () => {
    simularApi([aviso({ id: 1 }), aviso({ id: 2 }), aviso({ id: 3, read_at: '2026-09-10' })])
    renderConProveedores(<Avisos />)

    expect(await screen.findByTestId('sin-leer')).toHaveTextContent(textos.avisos.sinLeer(2))
  })

  it('distingue visualmente los avisos nuevos', async () => {
    simularApi([aviso({ id: 1 }), aviso({ id: 2, read_at: '2026-09-10' })])
    renderConProveedores(<Avisos />)

    expect(await screen.findByTestId('aviso-1')).toHaveClass('aviso-item--nuevo')
    expect(screen.getByTestId('aviso-2')).not.toHaveClass('aviso-item--nuevo')
  })

  it('permite marcar uno como leido', async () => {
    const mock = simularApi([aviso()])
    const user = userEvent.setup()
    renderConProveedores(<Avisos />)

    await screen.findByTestId('aviso-1')
    await user.click(screen.getByRole('button', { name: textos.avisos.nuevo }))

    await waitFor(() => {
      expect(mock.mock.calls.some((c) => String(c[0]).includes('/notifications/1/read'))).toBe(
        true,
      )
    })
  })

  it('permite marcar todos como leidos', async () => {
    const mock = simularApi([aviso({ id: 1 }), aviso({ id: 2 })])
    const user = userEvent.setup()
    renderConProveedores(<Avisos />)

    await screen.findByTestId('sin-leer')
    await user.click(screen.getByRole('button', { name: textos.avisos.marcarTodos }))

    await waitFor(() => {
      expect(mock.mock.calls.some((c) => String(c[0]).includes('/read-all'))).toBe(true)
    })
  })

  it('sin avisos sin leer no ofrece marcar todos', async () => {
    simularApi([aviso({ read_at: '2026-09-10' })])
    renderConProveedores(<Avisos />)

    await screen.findByTestId('lista-avisos')
    expect(
      screen.queryByRole('button', { name: textos.avisos.marcarTodos }),
    ).not.toBeInTheDocument()
  })
})
