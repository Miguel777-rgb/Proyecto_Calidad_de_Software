import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { textos } from './i18n/textos'
import { ESTADO_VACIO, USUARIO, renderConProveedores, respuesta, sesionDe } from './test-utils'

vi.mock('react-leaflet', async () => await import('./test-mocks/react-leaflet'))

/** Responde a cada endpoint que la aplicacion consulta al arrancar. */
function apiSimulada(alIniciarSesion?: () => Response) {
  return vi.fn(async (url: string) => {
    const ruta = String(url)
    if (ruta.includes('/auth/login')) return alIniciarSesion?.() ?? respuesta(sesionDe(USUARIO))
    if (ruta.includes('/status')) return respuesta(ESTADO_VACIO)
    if (ruta.includes('/settings')) return respuesta({ map_window_days: 5 })
    return respuesta({ status: 'ok' })
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', apiSimulada())
  })

  it('muestra la atribucion obligatoria a IMARPE en todas las vistas', () => {
    renderConProveedores(<App />, { ruta: '/entrar' })
    expect(screen.getByTestId('atribucion')).toHaveTextContent('IMARPE')
  })

  it('la pagina principal es publica y no exige iniciar sesion', async () => {
    renderConProveedores(<App />, { ruta: '/' })
    expect(
      await screen.findByRole('heading', { name: textos.estado.titulo }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: textos.entrar.titulo })).not.toBeInTheDocument()
  })

  it('sin sesion ofrece entrar y registrarse', () => {
    renderConProveedores(<App />, { ruta: '/entrar' })
    expect(screen.getByRole('link', { name: textos.navegacion.entrar })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: textos.navegacion.registrarse })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: textos.navegacion.salir })).not.toBeInTheDocument()
  })

  it('tras iniciar sesion muestra la pagina principal y permite salir', async () => {
    const user = userEvent.setup()
    renderConProveedores(<App />, { ruta: '/entrar' })
    await user.type(screen.getByLabelText(textos.comun.correo), USUARIO.email)
    await user.type(screen.getByLabelText(textos.comun.contrasena), 'miclave123')
    await user.click(screen.getByRole('button', { name: textos.entrar.boton }))

    expect(await screen.findByTestId('sesion-actual')).toHaveTextContent(USUARIO.email)
    expect(screen.getByRole('button', { name: textos.navegacion.salir })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: textos.navegacion.salir }))
    await waitFor(() => {
      expect(screen.queryByTestId('sesion-actual')).not.toBeInTheDocument()
    })
    expect(localStorage.getItem('ola.token')).toBeNull()
  })
})
