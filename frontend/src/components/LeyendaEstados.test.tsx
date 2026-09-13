import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LeyendaEstados } from './LeyendaEstados'
import { textos } from '../i18n/textos'
import { violacionesAxe } from '../test-utils'

describe('LeyendaEstados', () => {
  it('nombra los cuatro estados en espanol', () => {
    render(<LeyendaEstados />)
    const leyenda = screen.getByTestId('leyenda')
    for (const estado of ['warm', 'neutral', 'cold', 'no_data'] as const) {
      expect(leyenda).toHaveTextContent(textos.estado[estado])
    }
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = render(<LeyendaEstados />)
    expect(await violacionesAxe(container)).toEqual([])
  })
})
