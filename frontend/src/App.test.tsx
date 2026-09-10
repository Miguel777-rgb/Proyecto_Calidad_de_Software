import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { textos } from './i18n/textos'
import { USUARIO, renderConProveedores, respuesta, sesionDe } from './test-utils'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({ status: 'ok' })))
  })

  it('muestra la atribucion obligatoria a IMARPE en todas las vistas', () => {
    renderConProveedores(<App />, { ruta: '/entrar' })
    expect(screen.getByTestId('atribucion')).toHaveTextContent('IMARPE')
  })

  it('sin sesion redirige la pagina principal al inicio de sesion', async () => {
    renderConProveedores(<App />, { ruta: '/' })
    expect(
      await screen.findByRole('heading', { name: textos.entrar.titulo }),
    ).toBeInTheDocument()
  })

  it('sin sesion ofrece entrar y registrarse', () => {
    renderConProveedores(<App />, { ruta: '/entrar' })
    expect(screen.getByRole('link', { name: textos.navegacion.entrar })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: textos.navegacion.registrarse })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: textos.navegacion.salir })).not.toBeInTheDocument()
  })

  it('tras iniciar sesion muestra la pagina principal y permite salir', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).includes('/auth/login')
          ? respuesta(sesionDe(USUARIO))
          : respuesta({ status: 'ok', database: 'ok' }),
      ),
    )

    renderConProveedores(<App />, { ruta: '/entrar' })
    await user.type(screen.getByLabelText(textos.comun.correo), USUARIO.email)
    await user.type(screen.getByLabelText(textos.comun.contrasena), 'miclave123')
    await user.click(screen.getByRole('button', { name: textos.entrar.boton }))

    expect(await screen.findByTestId('sesion-actual')).toHaveTextContent(USUARIO.email)
    expect(screen.getByRole('button', { name: textos.navegacion.salir })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: textos.navegacion.salir }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: textos.entrar.titulo })).toBeInTheDocument()
    })
    expect(localStorage.getItem('ola.token')).toBeNull()
  })
})
