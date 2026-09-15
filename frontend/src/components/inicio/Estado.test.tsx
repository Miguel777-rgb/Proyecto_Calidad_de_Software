import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InsigniaEstado, SimboloEstado } from './Estado'
import { ESTADOS } from '@ola/compartido/inicio/datos'
import { textos } from '@ola/compartido/i18n/textos'
import { violacionesAxe } from '../../test-utils'

describe('SimboloEstado', () => {
  it('usa una forma distinta para cada estado', () => {
    const formas = ESTADOS.map((estado) => {
      const { container, unmount } = render(<SimboloEstado estado={estado} />)
      const forma = container.querySelector('svg')?.getAttribute('class')
      unmount()
      return forma
    })
    expect(new Set(formas).size).toBe(ESTADOS.length)
  })

  it('es decorativo para los lectores de pantalla', () => {
    const { container } = render(<SimboloEstado estado="warm" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('InsigniaEstado', () => {
  it.each(ESTADOS)('nombra el estado %s en espanol', (estado) => {
    render(<InsigniaEstado estado={estado} testId="nombre" />)
    expect(screen.getByTestId('nombre')).toHaveTextContent(textos.estado[estado])
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = render(
      <p>
        {ESTADOS.map((estado) => (
          <InsigniaEstado key={estado} estado={estado} />
        ))}
      </p>,
    )
    expect(await violacionesAxe(container)).toEqual([])
  })
})
