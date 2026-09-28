import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Recuperar, { ESPERA_REENVIO } from './Recuperar'
import { textos } from '@ola/compartido/i18n/textos'
import { USUARIO, renderConProveedores, respuesta, sesionDe, violacionesAxe } from '../test-utils'

const CORREO = 'pescador@ejemplo.pe'
const ENVIADO = { detail: 'Si ese correo tiene cuenta, te enviamos un código.' }

/** fetch simulado que responde segun la ruta pedida. */
function simularApi(confirmar: () => Response = () => respuesta(sesionDe(USUARIO))) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    if (url.endsWith('/auth/password-reset/request')) return respuesta(ENVIADO, 202)
    if (url.endsWith('/auth/password-reset/confirm')) return confirmar()
    return respuesta({ detail: 'Not Found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function cuerpoDe(fetchMock: ReturnType<typeof simularApi>, fin: string) {
  const llamada = fetchMock.mock.calls.find(([url]) => url.endsWith(fin))
  return JSON.parse(String((llamada?.[1] as RequestInit).body))
}

async function pedirCodigo(user = userEvent.setup()) {
  await user.type(screen.getByLabelText(textos.comun.correo), CORREO)
  await user.click(screen.getByRole('button', { name: textos.recuperar.enviar }))
  await screen.findByRole('status')
  return user
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Recuperar contraseña', () => {
  it('pide el correo y explica para que', () => {
    renderConProveedores(<Recuperar />)

    expect(screen.getByRole('heading', { name: textos.recuperar.titulo })).toBeInTheDocument()
    expect(screen.getByText(textos.recuperar.ayuda)).toBeInTheDocument()
  })

  it('un correo mal escrito se corrige antes de llamar a la API', async () => {
    const fetchMock = simularApi()
    renderConProveedores(<Recuperar />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(textos.comun.correo), 'pescador')
    await user.click(screen.getByRole('button', { name: textos.recuperar.enviar }))

    expect(screen.getByRole('alert')).toHaveTextContent(textos.errores.correoInvalido)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('al enviar dice que el codigo va al correo, aunque no tenga cuenta', async () => {
    const fetchMock = simularApi()
    renderConProveedores(<Recuperar />)

    await pedirCodigo()

    expect(screen.getByRole('status')).toHaveTextContent(textos.recuperar.enviado(CORREO))
    expect(cuerpoDe(fetchMock, '/request')).toEqual({ email: CORREO })
    expect(screen.getByText(textos.recuperar.espera(ESPERA_REENVIO))).toBeInTheDocument()
  })

  it('cambia la contraseña con el codigo y deja la sesion iniciada', async () => {
    const fetchMock = simularApi()
    renderConProveedores(<Recuperar />)
    const user = await pedirCodigo()

    await user.type(screen.getByLabelText(textos.recuperar.codigo), '482 913')
    await user.type(screen.getByLabelText(textos.recuperar.nueva), 'otra clave larga')
    await user.click(screen.getByRole('button', { name: textos.recuperar.boton }))

    await waitFor(() => expect(localStorage.getItem('ola.token')).toBe('token-de-prueba'))
    expect(cuerpoDe(fetchMock, '/confirm')).toEqual({
      email: CORREO,
      code: '482913',
      password: 'otra clave larga',
    })
  })

  it('un codigo incompleto se avisa antes de enviarlo', async () => {
    const fetchMock = simularApi()
    renderConProveedores(<Recuperar />)
    const user = await pedirCodigo()

    await user.type(screen.getByLabelText(textos.recuperar.codigo), '4829')
    await user.type(screen.getByLabelText(textos.recuperar.nueva), 'otra clave larga')
    await user.click(screen.getByRole('button', { name: textos.recuperar.boton }))

    expect(screen.getByRole('alert')).toHaveTextContent(textos.recuperar.codigoIncompleto)
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/confirm'))).toBe(false)
  })

  it('una contraseña corta se avisa antes de enviarla', async () => {
    simularApi()
    renderConProveedores(<Recuperar />)
    const user = await pedirCodigo()

    await user.type(screen.getByLabelText(textos.recuperar.codigo), '482913')
    await user.type(screen.getByLabelText(textos.recuperar.nueva), 'corta')
    await user.click(screen.getByRole('button', { name: textos.recuperar.boton }))

    expect(screen.getByRole('alert')).toHaveTextContent(textos.errores.contrasenaCorta)
  })

  it('muestra el error del backend si el codigo vencio', async () => {
    simularApi(() => respuesta({ detail: 'El código no es válido o ya venció.' }, 400))
    renderConProveedores(<Recuperar />)
    const user = await pedirCodigo()

    await user.type(screen.getByLabelText(textos.recuperar.codigo), '482913')
    await user.type(screen.getByLabelText(textos.recuperar.nueva), 'otra clave larga')
    await user.click(screen.getByRole('button', { name: textos.recuperar.boton }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El código no es válido o ya venció.')
    expect(localStorage.getItem('ola.token')).toBeNull()
  })

  it('tras un minuto ofrece enviar otro codigo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = simularApi()
    renderConProveedores(<Recuperar />)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await pedirCodigo(user)

    // Un segundo por vez: cada tic de la cuenta atras programa el siguiente.
    for (let s = 0; s < ESPERA_REENVIO; s += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
    }
    await user.click(await screen.findByRole('button', { name: textos.recuperar.reenviar }))

    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/request'))).toHaveLength(2),
    )
  })

  it('no tiene violaciones de accesibilidad en ninguno de los dos pasos', async () => {
    simularApi()
    const { container } = renderConProveedores(<Recuperar />)
    expect(await violacionesAxe(container)).toEqual([])

    await pedirCodigo()

    expect(await violacionesAxe(container)).toEqual([])
  })
})
