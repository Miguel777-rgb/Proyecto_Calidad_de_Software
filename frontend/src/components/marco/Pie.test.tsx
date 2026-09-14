import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Pie } from './Pie'
import { textos } from '../../i18n/textos'
import { violacionesAxe } from '../../test-utils'

describe('Pie', () => {
  it('atribuye la fuente de los datos a IMARPE, como exige su licencia', () => {
    render(<Pie />)
    expect(screen.getByTestId('atribucion')).toHaveTextContent('IMARPE / PRODUCE')
  })

  it('advierte que OLA no reemplaza los boletines oficiales', () => {
    render(<Pie />)
    expect(screen.getByRole('contentinfo')).toHaveTextContent(textos.app.avisoAlcance)
  })

  it('describe la aplicacion en lenguaje sencillo', () => {
    render(<Pie />)
    expect(screen.getByRole('contentinfo')).toHaveTextContent(textos.app.descripcion)
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = render(<Pie />)
    expect(await violacionesAxe(container)).toEqual([])
  })
})
