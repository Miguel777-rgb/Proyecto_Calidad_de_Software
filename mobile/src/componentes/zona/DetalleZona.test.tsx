import { fireEvent, render, screen } from '@testing-library/react-native'
import type { EstadoZona } from '@ola/compartido/api'
import { ESTADO_MUESTRA } from '@ola/compartido/pruebas'
import { DetalleZona } from './DetalleZona'

function zona(code: string): EstadoZona {
  return ESTADO_MUESTRA.zones.find((z) => z.laboratory.code === code)!
}

async function dibujar(code: string, extra: Partial<Parameters<typeof DetalleZona>[0]> = {}) {
  const acciones = { alCerrar: jest.fn(), alEntrar: jest.fn(), alVerHistorico: jest.fn() }
  await render(<DetalleZona zona={zona(code)} ventana={5} {...acciones} {...extra} />)
  return acciones
}

describe('DetalleZona', () => {
  it('el nombre de la zona es el encabezado, con su situacion', async () => {
    await dibujar('CALLAO')

    expect(screen.getByRole('header', { name: 'Callao' })).toBeOnTheScreen()
    expect(screen.getByTestId('detalle-situacion')).toHaveTextContent('Cálido')
  })

  it('muestra el promedio, los dias que promedia y el ultimo valor medido', async () => {
    await dibujar('CALLAO')

    expect(screen.getByTestId('detalle-promedio')).toHaveTextContent(/\+1\.20 °C sobre lo normal/)
    expect(screen.getByText('Promedio de los últimos 5 días')).toBeOnTheScreen()
    expect(screen.getByTestId('detalle-ultima-medicion')).toHaveTextContent(
      'Valor medido el 31/07/2026: +1.50 °C',
    )
  })

  it('sin configuracion no inventa cuantos dias promedia', async () => {
    await dibujar('CALLAO', { ventana: null })

    expect(screen.getByText('Promedio de los últimos días')).toBeOnTheScreen()
  })

  it('la alerta dice desde cuando, cuantas mediciones y el valor mas extremo', async () => {
    await dibujar('CALLAO')

    expect(screen.getByTestId('detalle-alerta')).toHaveTextContent(
      /En alerta cálida desde el 26\/07\/2026/,
    )
    expect(screen.getByTestId('detalle-alerta')).toHaveTextContent(
      /6 mediciones seguidas fuera de lo normal · valor más extremo \+1\.60 °C/,
    )
  })

  it('sin alerta explica por que no la hay', async () => {
    await dibujar('HUACHO')

    expect(screen.getByTestId('detalle-sin-alerta')).toHaveTextContent(
      'Sin alerta: el mar no se mantiene fuera de lo normal.',
    )
  })

  it('una zona que ya no mide lo dice y no ofrece recibir avisos', async () => {
    await dibujar('MATARANI')

    expect(screen.getByTestId('detalle-obsoleta')).toHaveTextContent(
      'No hay mediciones desde el 31/12/2016: no se puede saber cómo está el mar aquí.',
    )
    expect(screen.queryByTestId('detalle-promedio')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Entra para recibir avisos' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ver histórico de Matarani' })).toBeOnTheScreen()
  })

  it('cada accion hace lo suyo', async () => {
    const acciones = await dibujar('CALLAO')

    await fireEvent.press(screen.getByRole('button', { name: 'Entra para recibir avisos' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Ver histórico de Callao' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar el detalle de la zona' }))

    expect(acciones.alEntrar).toHaveBeenCalledTimes(1)
    expect(acciones.alVerHistorico).toHaveBeenCalledTimes(1)
    expect(acciones.alCerrar).toHaveBeenCalledTimes(1)
  })
})
