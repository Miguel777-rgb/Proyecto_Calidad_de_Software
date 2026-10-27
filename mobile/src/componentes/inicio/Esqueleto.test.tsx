import { render, screen, waitFor } from '@testing-library/react-native'
import { AccessibilityInfo, Animated } from 'react-native'
import { Esqueleto } from './Esqueleto'

describe('Esqueleto', () => {
  it('TalkBack anuncia que el estado se esta cargando', async () => {
    await render(<Esqueleto />)

    expect(screen.getByRole('progressbar', { name: 'Cargando el estado del mar' })).toBeOnTheScreen()
  })

  it('late mientras espera', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
    const bucle = jest.spyOn(Animated, 'loop')
    await render(<Esqueleto />)

    await waitFor(() => expect(bucle).toHaveBeenCalledTimes(1))
  })

  it('si el celular pide menos movimiento, se queda quieto', async () => {
    const consulta = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true)
    const bucle = jest.spyOn(Animated, 'loop')
    await render(<Esqueleto />)

    await waitFor(() => expect(consulta).toHaveBeenCalled())
    expect(bucle).not.toHaveBeenCalled()
  })
})
