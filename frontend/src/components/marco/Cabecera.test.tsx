import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Cabecera } from './Cabecera'
import { textos } from '@ola/compartido/i18n/textos'
import {
  apiPorRuta,
  conSesionIniciada,
  renderConProveedores,
  violacionesAxe,
} from '../../test-utils'

const { navegacion } = textos

describe('Cabecera', () => {
  it('muestra el nombre de la aplicacion como enlace a la portada', () => {
    renderConProveedores(<Cabecera />)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo).toHaveTextContent(textos.app.nombre)
    expect(within(titulo).getByRole('link')).toHaveAttribute('href', '/')
  })

  it('sin sesion ofrece entrar y crear cuenta', async () => {
    renderConProveedores(<Cabecera />)

    expect(await screen.findByRole('link', { name: navegacion.entrar })).toHaveAttribute(
      'href',
      '/entrar',
    )
    expect(screen.getByRole('link', { name: navegacion.registrarse })).toHaveAttribute(
      'href',
      '/registro',
    )
    expect(screen.queryByRole('button', { name: /Menú de cuenta/ })).not.toBeInTheDocument()
  })

  it('con sesion muestra el menu de cuenta en lugar de entrar', async () => {
    conSesionIniciada()
    vi.stubGlobal('fetch', apiPorRuta({}))
    renderConProveedores(<Cabecera />)

    expect(await screen.findByRole('button', { name: /Menú de cuenta/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: navegacion.entrar })).not.toBeInTheDocument()
  })

  it('mientras revalida la sesion no muestra entrar ni el menu', () => {
    conSesionIniciada()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderConProveedores(<Cabecera />)

    expect(screen.queryByRole('link', { name: navegacion.entrar })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Menú de cuenta/ })).not.toBeInTheDocument()
  })

  it('la navegacion de la banda marca la pantalla actual', () => {
    renderConProveedores(<Cabecera />, { ruta: '/proyeccion' })
    const nav = screen.getByRole('navigation', { name: navegacion.principal })

    expect(within(nav).getAllByRole('link')).toHaveLength(4)
    expect(within(nav).getByRole('link', { name: navegacion.proyeccion })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = renderConProveedores(<Cabecera />)
    await screen.findByRole('link', { name: navegacion.entrar })
    expect(await violacionesAxe(container)).toEqual([])
  })
})
