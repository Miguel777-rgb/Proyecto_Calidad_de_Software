import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MenuCuenta } from './MenuCuenta'
import type { Usuario } from '../../api/client'
import { AvisosContext } from '../../avisos/contexto'
import { textos } from '@ola/compartido/i18n/textos'
import {
  ADMIN,
  USUARIO,
  apiPorRuta,
  conSesionIniciada,
  renderConProveedores,
  violacionesAxe,
} from '../../test-utils'

const { navegacion } = textos

function montar(usuario: Usuario = USUARIO, sinLeer = 0) {
  vi.stubGlobal('fetch', apiPorRuta({}, usuario))
  return renderConProveedores(
    <AvisosContext.Provider value={{ sinLeer, refrescar: vi.fn() }}>
      <MenuCuenta usuario={usuario} />
      <button type="button">Fuera del menu</button>
    </AvisosContext.Provider>,
  )
}

const boton = () => screen.getByRole('button', { name: new RegExp(`^${navegacion.menuCuenta}`) })

async function abrir() {
  const user = userEvent.setup()
  await user.click(boton())
  return user
}

describe('MenuCuenta', () => {
  it('empieza cerrado', () => {
    montar()
    expect(boton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('sesion-actual')).not.toBeInTheDocument()
  })

  it('al pulsarlo muestra el correo y el rol de la sesion', async () => {
    montar()
    await abrir()

    expect(boton()).toHaveAttribute('aria-expanded', 'true')
    const sesion = screen.getByTestId('sesion-actual')
    expect(sesion).toHaveTextContent(USUARIO.email)
    expect(sesion).toHaveTextContent(textos.inicio.usuario)
  })

  it('un usuario ve sus zonas y sus avisos, pero no la administracion', async () => {
    montar()
    await abrir()

    expect(screen.getByRole('link', { name: navegacion.misZonas })).toHaveAttribute(
      'href',
      '/mis-zonas',
    )
    expect(screen.getByRole('link', { name: navegacion.avisos })).toHaveAttribute('href', '/avisos')
    expect(
      screen.queryByRole('link', { name: navegacion.administracion }),
    ).not.toBeInTheDocument()
  })

  it('el administrador ve tambien la administracion', async () => {
    montar(ADMIN)
    await abrir()

    expect(screen.getByRole('link', { name: navegacion.administracion })).toHaveAttribute(
      'href',
      '/admin',
    )
    expect(screen.getByTestId('sesion-actual')).toHaveTextContent(textos.inicio.administrador)
  })

  it('anuncia los avisos sin leer en el nombre del boton y los muestra', async () => {
    montar(USUARIO, 2)

    expect(boton()).toHaveAccessibleName(navegacion.menuCuentaConAvisos(2))
    expect(screen.getByTestId('insignia-avisos')).toHaveTextContent('2')

    await abrir()
    expect(screen.getByRole('link', { name: /Avisos/ })).toHaveTextContent(
      textos.avisos.sinLeer(2),
    )
  })

  it('usa el singular cuando hay un solo aviso sin leer', () => {
    montar(USUARIO, 1)
    expect(boton()).toHaveAccessibleName('Menú de cuenta, 1 aviso sin leer')
  })

  it('sin avisos sin leer no muestra el numero', () => {
    montar(USUARIO, 0)
    expect(boton()).toHaveAccessibleName(navegacion.menuCuenta)
    expect(screen.queryByTestId('insignia-avisos')).not.toBeInTheDocument()
  })

  it('Escape cierra el menu y devuelve el foco al boton', async () => {
    montar()
    const user = await abrir()

    await user.keyboard('{Escape}')
    expect(boton()).toHaveAttribute('aria-expanded', 'false')
    expect(boton()).toHaveFocus()
  })

  it('pulsar fuera del menu lo cierra', async () => {
    montar()
    const user = await abrir()

    await user.click(screen.getByRole('button', { name: 'Fuera del menu' }))
    expect(boton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('elegir una opcion cierra el menu', async () => {
    montar()
    const user = await abrir()

    await user.click(screen.getByRole('link', { name: navegacion.misZonas }))
    expect(boton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('cerrar sesion borra la sesion guardada', async () => {
    conSesionIniciada()
    montar()
    const user = await abrir()

    await user.click(screen.getByRole('button', { name: navegacion.salir }))
    await waitFor(() => expect(localStorage.getItem('ola.token')).toBeNull())
  })

  it('no tiene violaciones de accesibilidad con el menu abierto', async () => {
    const { container } = montar(ADMIN, 3)
    await abrir()
    expect(await violacionesAxe(container)).toEqual([])
  })
})
