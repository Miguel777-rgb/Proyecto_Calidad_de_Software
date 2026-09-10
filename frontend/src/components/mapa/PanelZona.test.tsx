import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PanelZona } from './PanelZona'
import type { EstadoZona } from '../../api/client'
import { textos } from '../../i18n/textos'
import { ESTADO_MUESTRA } from '../../test-utils'

const buscar = (code: string): EstadoZona =>
  ESTADO_MUESTRA.zones.find((z) => z.laboratory.code === code)!

describe('PanelZona', () => {
  it('invita a elegir una zona cuando no hay ninguna seleccionada', () => {
    render(<PanelZona zona={null} alCerrar={vi.fn()} />)
    expect(screen.getByTestId('panel-zona')).toHaveTextContent(textos.mapa.sinSeleccion)
  })

  it('muestra el nombre y la situacion de la zona elegida', () => {
    render(<PanelZona zona={buscar('CALLAO')} alCerrar={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Callao' })).toBeInTheDocument()
    expect(screen.getByTestId('panel-situacion')).toHaveTextContent(textos.estado.warm)
  })

  it('muestra el promedio y la fecha del ultimo dato', () => {
    render(<PanelZona zona={buscar('CALLAO')} alCerrar={vi.fn()} />)
    expect(screen.getByTestId('panel-promedio')).toHaveTextContent('1.20 °C')
    expect(screen.getByTestId('panel-ultima-medicion')).toHaveTextContent('2026-07-31')
  })

  it('detalla la alerta vigente en lenguaje sencillo', () => {
    render(<PanelZona zona={buscar('CALLAO')} alCerrar={vi.fn()} />)
    const alerta = screen.getByTestId('panel-alerta')
    expect(alerta).toHaveTextContent('2026-07-26')
    expect(alerta).toHaveTextContent('6 mediciones seguidas')
  })

  it('explica cuando la zona no tiene tendencia sostenida', () => {
    render(<PanelZona zona={buscar('HUACHO')} alCerrar={vi.fn()} />)
    expect(screen.getByTestId('panel-sin-alerta')).toBeInTheDocument()
    expect(screen.queryByTestId('panel-alerta')).not.toBeInTheDocument()
  })

  it('avisa cuando la zona no tiene datos recientes', () => {
    render(<PanelZona zona={buscar('MATARANI')} alCerrar={vi.fn()} />)
    expect(screen.getByTestId('panel-obsoleta')).toBeInTheDocument()
    expect(screen.getByTestId('panel-ultima-medicion')).toHaveTextContent('2016-12-31')
  })

  it('una zona sin datos recientes no muestra alerta ni explicacion de racha', () => {
    render(<PanelZona zona={buscar('MATARANI')} alCerrar={vi.fn()} />)
    expect(screen.queryByTestId('panel-alerta')).not.toBeInTheDocument()
    expect(screen.queryByTestId('panel-sin-alerta')).not.toBeInTheDocument()
  })

  it('permite cerrar el detalle', async () => {
    const alCerrar = vi.fn()
    render(<PanelZona zona={buscar('CALLAO')} alCerrar={alCerrar} />)

    await userEvent.setup().click(screen.getByRole('button', { name: textos.mapa.cerrarPanel }))
    expect(alCerrar).toHaveBeenCalledOnce()
  })
})
