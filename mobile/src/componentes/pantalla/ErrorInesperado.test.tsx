import { fireEvent, render, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { ErrorInesperado } from './ErrorInesperado'

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }))

describe('ErrorInesperado', () => {
  it('explica que fallo y tranquiliza sobre los datos', async () => {
    await render(<ErrorInesperado error={new Error('x')} retry={jest.fn()} />)

    expect(
      screen.getByRole('header', { name: 'Ocurrió un error inesperado. Inténtalo de nuevo.' }),
    ).toBeOnTheScreen()
    expect(screen.getByText('Tus datos están a salvo.')).toBeOnTheScreen()
  })

  it('«Volver al mapa» lleva al inicio y vuelve a intentar dibujar', async () => {
    const retry = jest.fn()
    await render(<ErrorInesperado error={new Error('x')} retry={retry} />)

    await fireEvent.press(screen.getByRole('button', { name: 'Volver al mapa' }))

    expect(router.replace).toHaveBeenCalledWith('/')
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('no muestra el mensaje tecnico del error', async () => {
    await render(<ErrorInesperado error={new Error('Cannot read properties of undefined')} retry={jest.fn()} />)

    expect(screen.queryByText(/Cannot read/)).toBeNull()
  })
})
