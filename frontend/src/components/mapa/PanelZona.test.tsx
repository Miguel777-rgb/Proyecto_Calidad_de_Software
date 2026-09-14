import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PanelZona } from './PanelZona'
import type { EstadoZona } from '../../api/client'
import { textos } from '../../i18n/textos'
import { ESTADO_MUESTRA, renderConProveedores, violacionesAxe } from '../../test-utils'

const buscar = (code: string): EstadoZona =>
  ESTADO_MUESTRA.zones.find((z) => z.laboratory.code === code)!

function montar({
  zona = null as EstadoZona | null,
  zonas = ESTADO_MUESTRA.zones,
  alSeleccionar = vi.fn(),
} = {}) {
  return renderConProveedores(
    <PanelZona
      zona={zona}
      zonas={zonas}
      ventana={5}
      alSeleccionar={alSeleccionar}
      alCerrar={vi.fn()}
    />,
  )
}

describe('PanelZona', () => {
  it('sin zona elegida invita a elegir una', () => {
    montar()
    expect(screen.getByTestId('panel-zona')).toHaveTextContent(textos.mapa.sinSeleccion)
  })

  it('ofrece accesos directos a las zonas en alerta', async () => {
    const alSeleccionar = vi.fn()
    montar({ alSeleccionar })

    const accesos = screen.getByRole('list', { name: textos.mapa.zonasEnAlerta })
    const botones = within(accesos).getAllByRole('button')
    expect(botones.map((b) => b.textContent)).toEqual(['Callao'])

    await userEvent.setup().click(botones[0])
    expect(alSeleccionar).toHaveBeenCalledWith('CALLAO')
  })

  it('sin alertas no muestra accesos', () => {
    montar({ zonas: ESTADO_MUESTRA.zones.map((z) => ({ ...z, open_alert: null })) })
    expect(screen.queryByTestId('accesos-alerta')).not.toBeInTheDocument()
  })

  it('con una zona elegida muestra su detalle', () => {
    montar({ zona: buscar('PISCO') })
    expect(screen.getByRole('heading', { name: 'Pisco' })).toBeInTheDocument()
    expect(screen.queryByText(textos.mapa.sinSeleccion)).not.toBeInTheDocument()
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = montar()
    expect(await violacionesAxe(container)).toEqual([])
  })
})
