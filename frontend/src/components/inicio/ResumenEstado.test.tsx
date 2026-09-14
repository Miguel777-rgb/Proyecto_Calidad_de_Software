import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResumenEstado } from './ResumenEstado'
import type { EstadoZona } from '../../api/client'
import { ESTADO_MUESTRA, violacionesAxe } from '../../test-utils'

const HOY = new Date(2026, 8, 14)

function montar(
  zonas: EstadoZona[] = ESTADO_MUESTRA.zones,
  { hoy = HOY, vigencia = 7 }: { hoy?: Date; vigencia?: number } = {},
) {
  return render(
    <ResumenEstado referencia="2026-07-31" zonas={zonas} hoy={hoy} vigenciaDias={vigencia} />,
  )
}

const conAlertaFriaEnPisco = ESTADO_MUESTRA.zones.map((z) =>
  z.laboratory.code === 'PISCO'
    ? {
        ...z,
        open_alert: {
          id: 2,
          state: 'cold' as const,
          started_on: '2026-07-28',
          streak_length: 5,
          peak_anomaly_c: '-1.5000',
        },
      }
    : z,
)

describe('ResumenEstado', () => {
  it('muestra la fecha del ultimo dato de IMARPE en formato dd/mm/aaaa', () => {
    montar()
    const fecha = screen.getByTestId('fecha-referencia')
    expect(fecha).toHaveTextContent('Último dato de IMARPE')
    expect(fecha).toHaveTextContent('31/07/2026')
  })

  it('resalta la antiguedad cuando el dato supera la vigencia', () => {
    montar()
    const antiguedad = screen.getByTestId('antiguedad-dato')
    expect(antiguedad).toHaveTextContent('hace 45 días')
    expect(antiguedad).toHaveAttribute('data-atrasado', 'true')
  })

  it('no resalta un dato que sigue vigente', () => {
    montar(undefined, { hoy: new Date(2026, 7, 2) })
    const antiguedad = screen.getByTestId('antiguedad-dato')
    expect(antiguedad).toHaveTextContent('hace 2 días')
    expect(antiguedad).toHaveAttribute('data-atrasado', 'false')
  })

  it('un dato del mismo dia se presenta como dato de hoy', () => {
    montar(undefined, { hoy: new Date(2026, 6, 31, 9) })
    expect(screen.getByTestId('antiguedad-dato')).toHaveTextContent('Dato de hoy')
  })

  it('nombra las zonas en alerta con su situacion', () => {
    montar(conAlertaFriaEnPisco)
    expect(screen.getByTestId('resumen-alertas')).toHaveTextContent(
      '2 zonas en alerta: Callao (cálida) y Pisco (fría)',
    )
  })

  it('usa el singular con una sola zona en alerta', () => {
    montar()
    expect(screen.getByTestId('resumen-alertas')).toHaveTextContent(
      '1 zona en alerta: Callao (cálida)',
    )
  })

  it('avisa cuando ninguna zona esta en alerta', () => {
    montar(ESTADO_MUESTRA.zones.map((z) => ({ ...z, open_alert: null })))
    expect(screen.getByTestId('resumen-alertas')).toHaveTextContent('Ninguna zona en alerta')
  })

  it('cuenta las zonas por estado con singular y plural', () => {
    montar()
    expect(screen.getByTestId('conteo-warm')).toHaveTextContent('2 cálidas')
    expect(screen.getByTestId('conteo-neutral')).toHaveTextContent('1 neutra')
    expect(screen.getByTestId('conteo-cold')).toHaveTextContent('1 fría')
    expect(screen.getByTestId('conteo-no_data')).toHaveTextContent('1 sin datos')
  })

  it('mantiene en el conteo los estados sin zonas', () => {
    montar(ESTADO_MUESTRA.zones.filter((z) => z.state !== 'cold'))
    expect(screen.getByTestId('conteo-cold')).toHaveTextContent('0 frías')
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = montar(conAlertaFriaEnPisco)
    expect(await violacionesAxe(container)).toEqual([])
  })
})
