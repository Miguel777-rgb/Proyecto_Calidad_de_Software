import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MisZonas from './MisZonas'
import { textos } from '../i18n/textos'
import {
  LABORATORIOS,
  conSesionIniciada,
  renderConProveedores,
  respuesta,
} from '../test-utils'

const suscripcion = (code: string) => ({
  id: 1,
  laboratory: LABORATORIOS.find((l) => l.code === code)!,
  created_at: '2026-09-10T00:00:00Z',
})

function simularApi(seguidas: string[] = [], alCambiar?: () => Response) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    const ruta = String(url)
    if (ruta.includes('/auth/me')) return respuesta({ ...LABORATORIOS[0], role: 'user' })
    if (ruta.includes('/subscriptions')) {
      if (init?.method === 'POST') return alCambiar?.() ?? respuesta(suscripcion('CALLAO'), 201)
      if (init?.method === 'DELETE') return alCambiar?.() ?? respuesta(null, 204)
      return respuesta(seguidas.map(suscripcion))
    }
    return respuesta(LABORATORIOS)
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('MisZonas', () => {
  beforeEach(() => {
    conSesionIniciada()
  })

  it('lista las 10 zonas del catalogo', async () => {
    simularApi()
    renderConProveedores(<MisZonas />)

    const lista = await screen.findByTestId('lista-zonas')
    for (const lab of LABORATORIOS) {
      expect(lista).toHaveTextContent(lab.name)
    }
  })

  it('explica que llegaran avisos por correo', async () => {
    simularApi()
    renderConProveedores(<MisZonas />)
    expect(await screen.findByText(textos.suscripciones.ayuda)).toBeInTheDocument()
  })

  it('avisa cuando no se sigue ninguna zona', async () => {
    simularApi()
    renderConProveedores(<MisZonas />)
    expect(await screen.findByTestId('sin-suscripciones')).toBeInTheDocument()
  })

  it('marca las zonas que ya se siguen', async () => {
    simularApi(['CALLAO', 'PISCO'])
    renderConProveedores(<MisZonas />)

    expect(await screen.findByTestId('siguiendo-CALLAO')).toBeInTheDocument()
    expect(screen.getByTestId('siguiendo-PISCO')).toBeInTheDocument()
    expect(screen.queryByTestId('siguiendo-ILO')).not.toBeInTheDocument()
  })

  it('permite seguir una zona', async () => {
    const mock = simularApi()
    const user = userEvent.setup()
    renderConProveedores(<MisZonas />)

    await screen.findByTestId('lista-zonas')
    const fila = screen.getByTestId('zona-CALLAO')
    await user.click(fila.querySelector('button')!)

    await waitFor(() => {
      expect(screen.getByTestId('siguiendo-CALLAO')).toBeInTheDocument()
    })
    const envio = mock.mock.calls.find((c) => c[1]?.method === 'POST')!
    expect(JSON.parse(envio[1]!.body as string)).toEqual({ laboratory_code: 'CALLAO' })
  })

  it('permite dejar de seguir una zona', async () => {
    const mock = simularApi(['CALLAO'])
    const user = userEvent.setup()
    renderConProveedores(<MisZonas />)

    await screen.findByTestId('siguiendo-CALLAO')
    await user.click(screen.getByTestId('zona-CALLAO').querySelector('button')!)

    await waitFor(() => {
      expect(screen.queryByTestId('siguiendo-CALLAO')).not.toBeInTheDocument()
    })
    expect(mock.mock.calls.some((c) => c[1]?.method === 'DELETE')).toBe(true)
  })

  it('muestra el mensaje del servidor si la suscripcion falla', async () => {
    simularApi([], () => respuesta({ detail: 'No existe un laboratorio con ese codigo.' }, 404))
    const user = userEvent.setup()
    renderConProveedores(<MisZonas />)

    await screen.findByTestId('lista-zonas')
    await user.click(screen.getByTestId('zona-CALLAO').querySelector('button')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('No existe un laboratorio')
  })
})
