import { fireEvent, render, screen, within } from '@testing-library/react-native'
import { ESTADO_MUESTRA } from '@ola/compartido/pruebas'
import { TarjetasZonas } from './TarjetasZonas'

const ZONAS = ESTADO_MUESTRA.zones

describe('TarjetasZonas', () => {
  it('lleva el encabezado de la lista para TalkBack', async () => {
    await render(<TarjetasZonas zonas={ZONAS} alElegir={jest.fn()} />)

    expect(screen.getByRole('header', { name: 'Todas las zonas' })).toBeOnTheScreen()
  })

  it('una tarjeta por zona, en el orden recibido', async () => {
    await render(<TarjetasZonas zonas={ZONAS} alElegir={jest.fn()} />)

    const botones = screen.getAllByRole('button')
    expect(botones.map((b) => b.props.testID)).toEqual(ZONAS.map((z) => `tarjeta-${z.laboratory.code}`))
  })

  it('una zona en alerta dice desde cuando y cuantas mediciones lleva', async () => {
    await render(<TarjetasZonas zonas={ZONAS} alElegir={jest.fn()} />)

    const callao = screen.getByTestId('tarjeta-CALLAO')
    expect(callao).toHaveTextContent(/Callao/)
    expect(callao).toHaveTextContent(/Cálido/)
    expect(callao).toHaveTextContent(/\+1\.20 °C sobre lo normal/)
    expect(callao).toHaveTextContent(/Último dato: 31\/07\/2026/)
    expect(screen.getByTestId('tarjeta-alerta-CALLAO')).toHaveTextContent(
      'En alerta desde 26/07/2026 · 6 mediciones seguidas',
    )
  })

  it('una zona sin alerta no lleva la linea de alerta', async () => {
    await render(<TarjetasZonas zonas={ZONAS} alElegir={jest.fn()} />)

    expect(screen.queryByTestId('tarjeta-alerta-HUACHO')).toBeNull()
    expect(screen.getByTestId('tarjeta-PISCO')).toHaveTextContent(/-1\.20 °C bajo lo normal/)
  })

  it('una zona que ya no mide dice desde cuando, sin promedio', async () => {
    await render(<TarjetasZonas zonas={ZONAS} alElegir={jest.fn()} />)

    const matarani = screen.getByTestId('tarjeta-MATARANI')
    expect(matarani).toHaveTextContent(/Sin datos recientes/)
    expect(matarani).toHaveTextContent(/Sin mediciones desde 31\/12\/2016/)
    expect(within(matarani).queryByText(/°C/)).toBeNull()
  })

  it('tocar una tarjeta elige su zona', async () => {
    const alElegir = jest.fn()
    await render(<TarjetasZonas zonas={ZONAS} alElegir={alElegir} />)

    await fireEvent.press(screen.getByTestId('tarjeta-PISCO'))

    expect(alElegir).toHaveBeenCalledWith('PISCO')
  })
})
