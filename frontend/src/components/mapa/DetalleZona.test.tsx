import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DetalleZona } from './DetalleZona'
import type { EstadoZona } from '../../api/client'
import { AvisosContext } from '../../avisos/contexto'
import { textos } from '@ola/compartido/i18n/textos'
import {
  ESTADO_MUESTRA,
  USUARIO,
  apiPorRuta,
  conSesionIniciada,
  renderConProveedores,
  respuesta,
  violacionesAxe,
} from '../../test-utils'

const buscar = (code: string): EstadoZona =>
  ESTADO_MUESTRA.zones.find((z) => z.laboratory.code === code)!

function montar(code: string, { alCerrar = vi.fn(), refrescar = vi.fn() } = {}) {
  return renderConProveedores(
    <AvisosContext.Provider value={{ sinLeer: 0, refrescar }}>
      <DetalleZona zona={buscar(code)} ventana={5} alCerrar={alCerrar} />
    </AvisosContext.Provider>,
  )
}

const suscripcionA = (code: string) => ({
  id: 1,
  laboratory: buscar(code).laboratory,
  created_at: '2026-09-10T00:00:00Z',
})

describe('DetalleZona — datos', () => {
  it('muestra el nombre y el estado de la zona', () => {
    montar('CALLAO')
    expect(screen.getByRole('heading', { name: 'Callao' })).toBeInTheDocument()
    expect(screen.getByTestId('panel-situacion')).toHaveTextContent(textos.estado.warm)
  })

  it('explica el promedio respecto a lo normal y cuantos dias abarca', () => {
    montar('CALLAO')
    expect(screen.getByTestId('panel-promedio')).toHaveTextContent('+1.20 °C')
    expect(screen.getByText(/sobre lo normal/)).toBeInTheDocument()
    expect(screen.getByText('Promedio de los últimos 5 días')).toBeInTheDocument()
  })

  it('muestra el ultimo valor medido con su fecha', () => {
    montar('CALLAO')
    expect(screen.getByTestId('panel-ultima-medicion')).toHaveTextContent(
      'Valor medido el 31/07/2026: +1.50 °C',
    )
  })

  it('detalla la alerta vigente con su valor mas extremo', () => {
    montar('CALLAO')
    const alerta = screen.getByTestId('panel-alerta')
    expect(alerta).toHaveTextContent('En alerta cálida desde el 26/07/2026')
    expect(alerta).toHaveTextContent('6 mediciones seguidas fuera de lo normal')
    expect(alerta).toHaveTextContent('valor más extremo +1.60 °C')
  })

  it('explica cuando la zona no esta en alerta', () => {
    montar('HUACHO')
    expect(screen.getByTestId('panel-sin-alerta')).toHaveTextContent(
      textos.mapa.sinAlertaExplicacion,
    )
    expect(screen.queryByTestId('panel-alerta')).not.toBeInTheDocument()
  })

  it('una zona sin datos recientes explica desde cuando no mide y no ofrece avisos', () => {
    montar('MATARANI')
    expect(screen.getByTestId('panel-obsoleta')).toHaveTextContent(
      'No hay mediciones desde el 31/12/2016',
    )
    expect(screen.queryByTestId('panel-promedio')).not.toBeInTheDocument()
    expect(screen.queryByTestId('avisos-zona')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: textos.mapa.entraParaAvisos })).not.toBeInTheDocument()
  })

  it('permite cerrar el detalle', async () => {
    const alCerrar = vi.fn()
    montar('CALLAO', { alCerrar })

    await userEvent.setup().click(screen.getByRole('button', { name: textos.mapa.cerrarPanel }))
    expect(alCerrar).toHaveBeenCalledOnce()
  })

  it('lleva al historico de la zona', () => {
    montar('CALLAO')
    expect(screen.getByRole('link', { name: 'Ver histórico de Callao' })).toHaveAttribute(
      'href',
      '/historico?zona=CALLAO',
    )
  })
})

describe('DetalleZona — avisos', () => {
  it('sin sesion invita a entrar', () => {
    montar('CALLAO')
    expect(screen.getByRole('link', { name: textos.mapa.entraParaAvisos })).toHaveAttribute(
      'href',
      '/entrar',
    )
  })

  it('con sesion permite recibir avisos de la zona', async () => {
    conSesionIniciada()
    const mock = apiPorRuta({ '/subscriptions': [] })
    vi.stubGlobal('fetch', mock)
    const refrescar = vi.fn()
    montar('CALLAO', { refrescar })

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Recibir avisos de Callao' }))

    expect(await screen.findByText('Recibes avisos de Callao')).toBeInTheDocument()
    const alta = mock.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === 'POST')
    expect(JSON.parse(String((alta![1] as RequestInit).body))).toEqual({ laboratory_code: 'CALLAO' })
    expect(refrescar).toHaveBeenCalled()
  })

  it('si ya recibe avisos permite dejar de recibirlos', async () => {
    conSesionIniciada()
    const mock = apiPorRuta({ '/subscriptions': [suscripcionA('CALLAO')] })
    vi.stubGlobal('fetch', mock)
    montar('CALLAO')

    expect(await screen.findByText('Recibes avisos de Callao')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: textos.mapa.dejarDeRecibir }))

    expect(await screen.findByRole('button', { name: 'Recibir avisos de Callao' })).toBeInTheDocument()
    expect(
      mock.mock.calls.some(
        (c) =>
          String(c[0]).includes('/subscriptions/CALLAO') &&
          (c[1] as RequestInit | undefined)?.method === 'DELETE',
      ),
    ).toBe(true)
  })

  it('si el servidor rechaza el cambio muestra su mensaje', async () => {
    conSesionIniciada()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const ruta = String(url)
        if (ruta.includes('/auth/me')) return respuesta(USUARIO)
        if (init?.method === 'POST') return respuesta({ detail: 'No se pudo registrar la zona.' }, 400)
        return respuesta([])
      }),
    )
    montar('CALLAO')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Recibir avisos de Callao' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar la zona.')
  })

  it('no tiene violaciones de accesibilidad sin sesion', async () => {
    const { container } = montar('CALLAO')
    expect(await violacionesAxe(container)).toEqual([])
  })

  it('no tiene violaciones de accesibilidad recibiendo avisos', async () => {
    conSesionIniciada()
    vi.stubGlobal('fetch', apiPorRuta({ '/subscriptions': [suscripcionA('CALLAO')] }))
    const { container } = montar('CALLAO')

    await waitFor(() => expect(screen.getByText('Recibes avisos de Callao')).toBeInTheDocument())
    expect(await violacionesAxe(container)).toEqual([])
  })
})
