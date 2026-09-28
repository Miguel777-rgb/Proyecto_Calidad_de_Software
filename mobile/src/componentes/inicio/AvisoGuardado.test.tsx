import { fireEvent, render, screen } from '@testing-library/react-native'
import { AvisoGuardado } from './AvisoGuardado'

describe('AvisoGuardado', () => {
  it('dice de cuando son los datos que se ven, en hora local', async () => {
    await render(
      <AvisoGuardado guardadoEn={new Date(2026, 8, 23, 8, 46).getTime()} alReintentar={jest.fn()} />,
    )

    expect(
      screen.getByText('Sin conexión. Datos guardados el 23/09/2026 a las 08:46.'),
    ).toBeOnTheScreen()
  })

  it('ofrece reintentar', async () => {
    const alReintentar = jest.fn()
    await render(<AvisoGuardado guardadoEn={0} alReintentar={alReintentar} />)

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))

    expect(alReintentar).toHaveBeenCalledTimes(1)
  })
})
