import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { textos } from '@ola/compartido/i18n/textos'
import {
  ESTADO_VACIO,
  USUARIO,
  conSesionIniciada,
  renderConProveedores,
  respuesta,
  sesionDe,
} from './test-utils'

vi.mock('react-leaflet', async () => await import('./test-mocks/react-leaflet'))

const { navegacion } = textos

/** Responde a cada endpoint que la aplicacion consulta al arrancar. */
function apiSimulada({ sinLeer = 0 }: { sinLeer?: number } = {}) {
  return vi.fn(async (url: string) => {
    const ruta = String(url)
    if (ruta.includes('/auth/login')) return respuesta(sesionDe(USUARIO))
    if (ruta.includes('/auth/me')) return respuesta(USUARIO)
    if (ruta.includes('/notifications')) return respuesta({ unread: sinLeer, items: [] })
    if (ruta.includes('/status')) return respuesta(ESTADO_VACIO)
    if (ruta.includes('/settings')) return respuesta({ map_window_days: 5 })
    if (ruta.includes('/laboratories')) return respuesta([])
    return respuesta({ status: 'ok' })
  })
}

const botonCuenta = () => screen.findByRole('button', { name: new RegExp(`^${navegacion.menuCuenta}`) })

/**
 * Las pruebas que esperan una pantalla de carga diferida esperan hasta 10 s a
 * que llegue; la prueba entera necesita mas margen que los 5 s por defecto de
 * Vitest. Sin esto, con la cobertura activa la prueba se cortaba antes de que
 * vencieran sus propias esperas (D-23).
 */
const CON_CARGA_DIFERIDA = 20_000

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

  it('sin sesion ofrece entrar y crear cuenta', () => {
    renderConProveedores(<App />, { ruta: '/historico' })
    expect(screen.getByRole('link', { name: navegacion.entrar })).toHaveAttribute('href', '/entrar')
    expect(screen.getByRole('link', { name: navegacion.registrarse })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Menú de cuenta/ })).not.toBeInTheDocument()
  })

  it('mientras llega el codigo de la portada muestra su titulo y su silueta', () => {
    renderConProveedores(<App />, { ruta: '/' })
    expect(screen.getByRole('heading', { name: textos.estado.titulo })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: textos.estado.cargando })).toBeInTheDocument()
  })

  it('las pantallas se cargan al abrirlas', async () => {
    renderConProveedores(<App />, { ruta: '/entrar' })
    // Con varias pruebas en paralelo, la primera descarga de la pantalla en
    // jsdom puede superar el segundo de espera por defecto.
    expect(
      await screen.findByRole('heading', { name: textos.entrar.titulo }, { timeout: 10_000 }),
    ).toBeInTheDocument()
  }, CON_CARGA_DIFERIDA)

  it('ofrece saltar directamente al contenido principal', () => {
    renderConProveedores(<App />, { ruta: '/entrar' })
    expect(screen.getByRole('link', { name: navegacion.saltar })).toHaveAttribute(
      'href',
      '#contenido',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido')
  })

  it('la banda y la barra inferior ofrecen las mismas cuatro pantallas', () => {
    renderConProveedores(<App />, { ruta: '/entrar' })
    const navegaciones = screen.getAllByRole('navigation', { name: navegacion.principal })

    expect(navegaciones).toHaveLength(2)
    const destinos = navegaciones.map((nav) =>
      within(nav)
        .getAllByRole('link')
        .map((enlace) => enlace.getAttribute('href')),
    )
    expect(destinos[0]).toEqual(destinos[1])
  })

  it('tras iniciar sesion muestra el menu de cuenta y permite salir', async () => {
    const user = userEvent.setup()
    renderConProveedores(<App />, { ruta: '/entrar' })
    // La pantalla se descarga al abrirla: se espera a que aparezca.
    await user.type(
      await screen.findByLabelText(textos.comun.correo, undefined, { timeout: 10_000 }),
      USUARIO.email,
    )
    await user.type(screen.getByLabelText(textos.comun.contrasena), 'miclave123')
    await user.click(screen.getByRole('button', { name: textos.entrar.boton }))

    // Entrar redirige a la portada; el menu se cierra al cambiar de ruta, asi
    // que se abre cuando la redireccion ya termino. La portada se descarga al
    // abrirla y en jsdom su primera carga (con Leaflet) supera el segundo.
    await screen.findByRole('heading', { name: textos.estado.titulo }, { timeout: 10_000 })
    await user.click(await botonCuenta())
    expect(screen.getByTestId('sesion-actual')).toHaveTextContent(USUARIO.email)

    await user.click(screen.getByRole('button', { name: navegacion.salir }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Menú de cuenta/ })).not.toBeInTheDocument()
    })
    expect(localStorage.getItem('ola.token')).toBeNull()
  }, CON_CARGA_DIFERIDA)

  it('el menu de cuenta anuncia los avisos sin leer', async () => {
    vi.stubGlobal('fetch', apiSimulada({ sinLeer: 2 }))
    conSesionIniciada()
    renderConProveedores(<App />, { ruta: '/historico' })

    expect(
      await screen.findByRole('button', { name: navegacion.menuCuentaConAvisos(2) }),
    ).toBeInTheDocument()
  })
})
