import { render, screen } from '@testing-library/react-native'
import type { EstadoZona } from '@ola/compartido/api'
import { ESTADO_MUESTRA } from '@ola/compartido/pruebas'
import { color } from '../../tema'
import { ResumenEstado } from './ResumenEstado'

const ZONAS = ESTADO_MUESTRA.zones

async function dibujar({
  hoy = new Date(2026, 6, 31, 9, 0),
  zonas = ZONAS,
  vigenciaDias = 7,
}: { hoy?: Date; zonas?: EstadoZona[]; vigenciaDias?: number } = {}) {
  await render(
    <ResumenEstado referencia="2026-07-31" zonas={zonas} hoy={hoy} vigenciaDias={vigenciaDias} />,
  )
}

describe('ResumenEstado', () => {
  it('muestra la fecha del ultimo dato de IMARPE sin desfase horario', async () => {
    await dibujar()

    expect(screen.getByTestId('fecha-referencia')).toHaveTextContent(/Último dato de IMARPE/)
    expect(screen.getByTestId('fecha-referencia')).toHaveTextContent(/31\/07\/2026/)
  })

  it('el dato del mismo dia se anuncia como de hoy, sin resaltar', async () => {
    await dibujar()

    expect(screen.getByTestId('antiguedad-dato')).toHaveTextContent('Dato de hoy')
    expect(screen.getByTestId('antiguedad-dato')).toHaveStyle({
      backgroundColor: color['marea-fondo'],
    })
  })

  it('un dato mas viejo que la vigencia se resalta', async () => {
    await dibujar({ hoy: new Date(2026, 8, 23, 8, 46) })

    expect(screen.getByTestId('antiguedad-dato')).toHaveTextContent('hace 54 días')
    expect(screen.getByTestId('antiguedad-dato')).toHaveStyle({
      backgroundColor: color['atencion-fondo'],
    })
  })

  it('justo en el limite de la vigencia todavia no se resalta', async () => {
    await dibujar({ hoy: new Date(2026, 7, 7), vigenciaDias: 7 })

    expect(screen.getByTestId('antiguedad-dato')).toHaveTextContent('hace 7 días')
    expect(screen.getByTestId('antiguedad-dato')).toHaveStyle({
      backgroundColor: color['marea-fondo'],
    })
  })

  it('nombra las zonas en alerta con su situacion', async () => {
    await dibujar()

    expect(screen.getByTestId('resumen-alertas')).toHaveTextContent(
      '1 zona en alerta: Callao (cálida)',
    )
  })

  it('sin alertas lo dice en lugar de dejar el espacio vacio', async () => {
    await dibujar({ zonas: ZONAS.map((z) => ({ ...z, open_alert: null })) })

    expect(screen.getByTestId('resumen-alertas')).toHaveTextContent('Ninguna zona en alerta')
  })

  it('cuenta las zonas por estado, incluidos los estados sin zonas', async () => {
    await dibujar({ zonas: ZONAS.filter((z) => z.state !== 'cold') })

    expect(screen.getByLabelText('2 cálidas')).toBeOnTheScreen()
    expect(screen.getByLabelText('1 neutra')).toBeOnTheScreen()
    expect(screen.getByLabelText('0 frías')).toBeOnTheScreen()
    expect(screen.getByLabelText('1 sin datos')).toBeOnTheScreen()
  })
})
