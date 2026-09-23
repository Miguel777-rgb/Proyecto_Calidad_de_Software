import { fireEvent, render, screen } from '@testing-library/react-native'
import { ADMIN, sesionDe, USUARIO } from '../../../pruebas/utilidades'
import { ProveedorSesion, type Sesion } from '../../sesion'
import { LETRA_MAXIMA } from '../../tema'
import { Banda } from './Banda'

async function renderBanda(sesion: Sesion = sesionDe(null)) {
  const alEntrar = jest.fn()
  const alIr = jest.fn()
  await render(
    <ProveedorSesion valor={sesion}>
      <Banda alEntrar={alEntrar} alIr={alIr} />
    </ProveedorSesion>,
  )
  return { alEntrar, alIr }
}

describe('Banda', () => {
  it('muestra el logotipo como encabezado, con la letra limitada al 130 %', async () => {
    await renderBanda()

    const logotipo = screen.getByRole('header', { name: 'OLA' })
    expect(logotipo.props.maxFontSizeMultiplier).toBe(LETRA_MAXIMA.banda)
    expect(LETRA_MAXIMA.banda).toBe(1.3)
  })

  it('sin sesion ofrece entrar', async () => {
    const { alEntrar } = await renderBanda()

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }))

    expect(alEntrar).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('boton-cuenta')).toBeNull()
  })

  it('con sesion muestra el boton de cuenta en lugar de Entrar', async () => {
    await renderBanda(sesionDe(USUARIO))

    expect(screen.getByRole('button', { name: 'Menú de cuenta' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Entrar' })).toBeNull()
    expect(screen.queryByTestId('insignia-avisos')).toBeNull()
  })

  it('anuncia los avisos sin leer en el boton y en la insignia', async () => {
    await renderBanda(sesionDe(USUARIO, 2))

    expect(
      screen.getByRole('button', { name: 'Menú de cuenta, 2 avisos sin leer' }),
    ).toBeOnTheScreen()
    expect(screen.getByTestId('insignia-avisos')).toHaveTextContent('2')
  })

  it('un solo aviso se anuncia en singular', async () => {
    await renderBanda(sesionDe(USUARIO, 1))

    expect(screen.getByRole('button', { name: 'Menú de cuenta, 1 aviso sin leer' })).toBeOnTheScreen()
  })

  it('mas de 99 avisos se resumen como 99+ para que la insignia no crezca', async () => {
    await renderBanda(sesionDe(USUARIO, 140))

    expect(screen.getByTestId('insignia-avisos')).toHaveTextContent('99+')
  })

  it('el boton de cuenta abre la hoja con la sesion y dice si esta abierta', async () => {
    await renderBanda(sesionDe(ADMIN))
    const boton = screen.getByRole('button', { name: 'Menú de cuenta' })
    expect(boton).toBeCollapsed()

    await fireEvent.press(boton)

    expect(screen.getByTestId('sesion-actual')).toHaveTextContent(/admin@ola\.pe/)
    expect(screen.getByRole('button', { name: 'Menú de cuenta' })).toBeExpanded()
  })
})
