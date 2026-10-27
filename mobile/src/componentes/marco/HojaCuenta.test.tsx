import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Usuario } from '@ola/compartido/api'
import { ADMIN, USUARIO } from '../../../pruebas/utilidades'
import { debeCerrar, HojaCuenta } from './HojaCuenta'

async function renderHoja(usuario: Usuario = USUARIO, sinLeer = 0) {
  const props = { alCerrar: jest.fn(), alIr: jest.fn(), alSalir: jest.fn() }
  const { container } = await render(
    <HojaCuenta visible usuario={usuario} sinLeer={sinLeer} {...props} />,
  )
  return { ...props, container }
}

describe('HojaCuenta', () => {
  it('muestra con que cuenta se entro y su rol', async () => {
    await renderHoja()

    const sesion = screen.getByTestId('sesion-actual')
    expect(sesion).toHaveTextContent(/Conectado como/)
    expect(sesion).toHaveTextContent(/pescador@ejemplo\.pe/)
    expect(sesion).toHaveTextContent(/Usuario/)
  })

  it('ofrece mis zonas, avisos y cerrar sesion, sin administracion', async () => {
    await renderHoja()

    for (const nombre of ['Mis zonas', 'Avisos', 'Cerrar sesión']) {
      expect(screen.getByRole('button', { name: nombre })).toBeOnTheScreen()
    }
    expect(screen.queryByText(/administración/i)).toBeNull()
  })

  it('a un administrador le recuerda que la administracion esta en la web', async () => {
    await renderHoja(ADMIN)

    expect(screen.getByTestId('sesion-actual')).toHaveTextContent(/Administrador/)
    expect(screen.getByText('La administración se hace desde la web.')).toBeOnTheScreen()
  })

  it('anuncia los avisos sin leer junto a la opcion', async () => {
    await renderHoja(USUARIO, 2)

    expect(screen.getByRole('button', { name: 'Avisos, 2 sin leer' })).toBeOnTheScreen()
    expect(screen.getByText('2 sin leer')).toBeOnTheScreen()
  })

  it('elegir una opcion cierra la hoja y lleva a su pantalla', async () => {
    const { alCerrar, alIr } = await renderHoja()

    await fireEvent.press(screen.getByRole('button', { name: 'Mis zonas' }))

    expect(alCerrar).toHaveBeenCalled()
    expect(alIr).toHaveBeenCalledWith('mis-zonas')
  })

  it('cerrar sesion cierra la hoja y sale', async () => {
    const { alCerrar, alSalir } = await renderHoja()

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(alCerrar).toHaveBeenCalled()
    expect(alSalir).toHaveBeenCalledTimes(1)
  })

  it('tocar fuera de la hoja la cierra', async () => {
    const { alCerrar, alSalir } = await renderHoja()

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar el menú de cuenta' }))

    expect(alCerrar).toHaveBeenCalledTimes(1)
    expect(alSalir).not.toHaveBeenCalled()
  })

  it('el boton «atras» de Android la cierra', async () => {
    const { alCerrar, container } = await renderHoja()
    const [ventana] = container.queryAll((i) => typeof i.props.onRequestClose === 'function')

    await fireEvent(ventana, 'requestClose')

    expect(alCerrar).toHaveBeenCalledTimes(1)
  })

  it('la hoja vive en su propia ventana: TalkBack no sale de ella mientras esta abierta', async () => {
    const { container } = await renderHoja()

    expect(container.queryAll((i) => i.type === 'Modal')).toHaveLength(1)
  })
})

describe('debeCerrar', () => {
  it('cierra al arrastrar hacia abajo mas de 80 dp', () => {
    expect(debeCerrar(81, 0)).toBe(true)
    expect(debeCerrar(80, 0)).toBe(false)
  })

  it('cierra con un gesto rapido aunque sea corto', () => {
    expect(debeCerrar(30, 1.5)).toBe(true)
  })

  it('no cierra con un toque que apenas se mueve, aunque sea rapido', () => {
    expect(debeCerrar(10, 3)).toBe(false)
  })

  it('arrastrar hacia arriba nunca cierra', () => {
    expect(debeCerrar(-200, -3)).toBe(false)
  })
})
