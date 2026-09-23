import { fireEvent, render, screen } from '@testing-library/react-native'
import * as areaSegura from 'react-native-safe-area-context'
import { LETRA_MAXIMA } from '../../tema'
import { BarraInferior } from './BarraInferior'

describe('BarraInferior', () => {
  it('ofrece las cuatro pantallas en el mismo orden que la web', async () => {
    await render(<BarraInferior actual="index" alElegir={jest.fn()} />)

    const nombres = screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)
    expect(nombres).toEqual(['Mapa', 'Histórico', 'Comparar', 'Próximos días'])
  })

  it('marca como seleccionada solo la pantalla actual', async () => {
    await render(<BarraInferior actual="historico" alElegir={jest.fn()} />)

    expect(screen.getByRole('tab', { name: 'Histórico', selected: true })).toBeOnTheScreen()
    expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1)
  })

  it('al tocar una pestana avisa cual se eligio', async () => {
    const alElegir = jest.fn()
    await render(<BarraInferior actual="index" alElegir={alElegir} />)

    await fireEvent.press(screen.getByRole('tab', { name: 'Próximos días' }))

    expect(alElegir).toHaveBeenCalledWith('proyeccion')
  })

  it('las etiquetas crecen con la letra del celular solo hasta el 150 %', async () => {
    await render(<BarraInferior actual="index" alElegir={jest.fn()} />)

    const etiqueta = screen.getByText('Próximos días')
    expect(etiqueta.props.maxFontSizeMultiplier).toBe(LETRA_MAXIMA.barra)
    expect(LETRA_MAXIMA.barra).toBe(1.5)
    // Con letra grande «Próximos días» se parte en dos lineas en lugar de cortarse.
    expect(etiqueta.props.numberOfLines).toBe(2)
  })

  it('cada pestana mide al menos 48 dp de alto, el minimo tactil de Android', async () => {
    await render(<BarraInferior actual="index" alElegir={jest.fn()} />)

    for (const pestana of screen.getAllByRole('tab')) {
      expect(pestana).toHaveStyle({ minHeight: 64 })
    }
  })

  it('se extiende bajo la zona de gestos del sistema sin poner pestanas en ella', async () => {
    jest
      .spyOn(areaSegura, 'useSafeAreaInsets')
      .mockReturnValue({ top: 32, bottom: 24, left: 0, right: 0 })
    await render(<BarraInferior actual="index" alElegir={jest.fn()} />)

    expect(screen.getByTestId('barra-inferior')).toHaveStyle({ paddingBottom: 24 })
  })
})
