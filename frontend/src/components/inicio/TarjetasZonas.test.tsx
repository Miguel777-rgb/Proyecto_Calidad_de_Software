import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TarjetaZona, TarjetasZonas } from './TarjetasZonas'
import type { EstadoZona } from '../../api/client'
import { ESTADO_MUESTRA, violacionesAxe } from '../../test-utils'

const buscar = (code: string): EstadoZona =>
  ESTADO_MUESTRA.zones.find((z) => z.laboratory.code === code)!

function montar(code: string, seleccionada = false, alSeleccionar = vi.fn()) {
  return render(
    <TarjetaZona zona={buscar(code)} seleccionada={seleccionada} alSeleccionar={alSeleccionar} />,
  )
}

describe('TarjetaZona', () => {
  it('muestra nombre, estado y promedio respecto a lo normal', () => {
    montar('CALLAO')
    const tarjeta = screen.getByTestId('tarjeta-CALLAO')
    expect(tarjeta).toHaveTextContent('Callao')
    expect(tarjeta).toHaveTextContent('Cálido')
    expect(tarjeta).toHaveTextContent('+1.20 °C')
    expect(tarjeta).toHaveTextContent('sobre lo normal')
  })

  it('una zona fria se explica bajo lo normal y una neutra dentro de lo normal', () => {
    montar('PISCO')
    expect(screen.getByTestId('tarjeta-PISCO')).toHaveTextContent('-1.20 °C bajo lo normal')
    montar('TUMBES')
    expect(screen.getByTestId('tarjeta-TUMBES')).toHaveTextContent('+0.10 °C dentro de lo normal')
  })

  it('indica la fecha del ultimo dato', () => {
    montar('HUACHO')
    expect(screen.getByTestId('tarjeta-HUACHO')).toHaveTextContent('Último dato: 31/07/2026')
  })

  it('una zona sin datos recientes dice desde cuando no mide y no muestra promedio', () => {
    montar('MATARANI')
    const tarjeta = screen.getByTestId('tarjeta-MATARANI')
    expect(tarjeta).toHaveTextContent('Sin mediciones desde 31/12/2016')
    expect(tarjeta).not.toHaveTextContent('°C')
  })

  it('una alerta vigente dice desde cuando y cuantas mediciones lleva', () => {
    montar('CALLAO')
    expect(screen.getByTestId('tarjeta-alerta-CALLAO')).toHaveTextContent(
      'En alerta desde 26/07/2026 · 6 mediciones seguidas',
    )
  })

  it('sin alerta no muestra la linea de alerta', () => {
    montar('HUACHO')
    expect(screen.queryByTestId('tarjeta-alerta-HUACHO')).not.toBeInTheDocument()
  })

  it('al pulsarla avisa que zona se eligio', async () => {
    const alSeleccionar = vi.fn()
    montar('HUACHO', false, alSeleccionar)

    await userEvent.setup().click(screen.getByTestId('tarjeta-HUACHO'))
    expect(alSeleccionar).toHaveBeenCalledWith('HUACHO')
  })

  it('refleja la seleccion para lectores de pantalla', () => {
    montar('HUACHO', true)
    expect(screen.getByTestId('tarjeta-HUACHO')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('TarjetasZonas', () => {
  it('lista una tarjeta por zona en el orden recibido', () => {
    const zonas = [buscar('PISCO'), buscar('CALLAO'), buscar('TUMBES')]
    render(<TarjetasZonas zonas={zonas} seleccionada={null} alSeleccionar={vi.fn()} />)

    const botones = within(screen.getByTestId('tarjetas-zonas')).getAllByRole('button')
    expect(botones.map((b) => b.getAttribute('data-testid'))).toEqual([
      'tarjeta-PISCO',
      'tarjeta-CALLAO',
      'tarjeta-TUMBES',
    ])
  })

  it('tiene un titulo que agrupa las tarjetas', () => {
    render(
      <TarjetasZonas zonas={ESTADO_MUESTRA.zones} seleccionada={null} alSeleccionar={vi.fn()} />,
    )
    expect(screen.getByRole('region', { name: 'Todas las zonas' })).toBeInTheDocument()
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = render(
      <TarjetasZonas zonas={ESTADO_MUESTRA.zones} seleccionada="CALLAO" alSeleccionar={vi.fn()} />,
    )
    expect(await violacionesAxe(container)).toEqual([])
  })
})
