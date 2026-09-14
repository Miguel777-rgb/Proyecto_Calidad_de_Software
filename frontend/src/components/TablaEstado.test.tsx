import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TablaEstado } from './TablaEstado'
import { ESTADO_MUESTRA, violacionesAxe } from '../test-utils'

function montar({
  ventana = 5 as number | null,
  seleccionada = null as string | null,
  alSeleccionar = vi.fn(),
} = {}) {
  return render(
    <TablaEstado
      zonas={ESTADO_MUESTRA.zones}
      ventana={ventana}
      seleccionada={seleccionada}
      alSeleccionar={alSeleccionar}
    />,
  )
}

describe('TablaEstado', () => {
  it('tiene una columna por dato con los dias que promedia el mapa', () => {
    montar()
    const encabezados = screen.getAllByRole('columnheader').map((c) => c.textContent)
    expect(encabezados).toEqual(['Zona', 'Situación', 'Promedio 5 días', 'Último dato', 'Alerta'])
  })

  it('sin la configuracion el encabezado dice solo Promedio', () => {
    montar({ ventana: null })
    expect(screen.getByRole('columnheader', { name: 'Promedio' })).toBeInTheDocument()
  })

  it('muestra el promedio con signo y la fecha como dd/mm/aaaa', () => {
    montar()
    const callao = screen.getByTestId('zona-CALLAO')
    expect(callao).toHaveTextContent('+1.20 °C')
    expect(callao).toHaveTextContent('31/07/2026')
  })

  it('una zona sin datos recientes muestra su ultima fecha y cuanto hace', () => {
    montar()
    const matarani = screen.getByTestId('zona-MATARANI')
    expect(matarani).toHaveTextContent('—')
    expect(matarani).toHaveTextContent('31/12/2016 (hace 3499 días)')
  })

  it('resume la alerta vigente', () => {
    montar()
    expect(screen.getByTestId('alerta-CALLAO')).toHaveTextContent('Desde 26/07/2026 · 6 mediciones')
    expect(screen.getByTestId('zona-HUACHO')).toHaveTextContent('Sin alerta')
  })

  it('el nombre de la zona permite elegirla', async () => {
    const alSeleccionar = vi.fn()
    montar({ alSeleccionar })

    const fila = screen.getByTestId('zona-PISCO')
    await userEvent.setup().click(within(fila).getByRole('button', { name: 'Pisco' }))
    expect(alSeleccionar).toHaveBeenCalledWith('PISCO')
  })

  it('marca la zona elegida', () => {
    montar({ seleccionada: 'PISCO' })
    expect(screen.getByRole('button', { name: 'Pisco' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Callao' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = montar({ seleccionada: 'CALLAO' })
    expect(await violacionesAxe(container)).toEqual([])
  })
})
