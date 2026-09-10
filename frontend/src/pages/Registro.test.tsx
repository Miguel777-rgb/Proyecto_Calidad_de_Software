import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Registro from './Registro'
import { textos } from '../i18n/textos'
import { USUARIO, renderConProveedores, respuesta, sesionDe } from '../test-utils'

async function completar(clave: string, nombre?: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(textos.comun.correo), 'nuevo@ejemplo.pe')
  if (nombre !== undefined) {
    await user.type(screen.getByLabelText(/Nombre completo/), nombre)
  }
  await user.type(screen.getByLabelText(textos.comun.contrasena), clave)
  await user.click(screen.getByRole('button', { name: textos.registro.boton }))
}

describe('Registro', () => {
  it('registra al usuario y deja la sesion iniciada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(sesionDe(USUARIO), 201))
    vi.stubGlobal('fetch', fetchMock)

    renderConProveedores(<Registro />)
    await completar('miclave123', 'Juan Pescador')

    expect(localStorage.getItem('ola.token')).toBe('token-de-prueba')
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(cuerpo).toEqual({
      email: 'nuevo@ejemplo.pe',
      password: 'miclave123',
      full_name: 'Juan Pescador',
    })
  })

  it('omite el nombre cuando se deja vacio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(sesionDe(USUARIO), 201))
    vi.stubGlobal('fetch', fetchMock)

    renderConProveedores(<Registro />)
    await completar('miclave123')

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('full_name')
  })

  it('rechaza una contrasena corta sin llamar al servidor', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderConProveedores(<Registro />)
    await completar('1234')

    expect(await screen.findByRole('alert')).toHaveTextContent(textos.errores.contrasenaCorta)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('muestra el mensaje del servidor si el correo ya existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          respuesta({ detail: 'Ya existe una cuenta registrada con ese correo.' }, 409),
        ),
    )
    renderConProveedores(<Registro />)
    await completar('miclave123')

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta')
    expect(localStorage.getItem('ola.token')).toBeNull()
  })

  it('explica la politica de contrasenas al usuario', () => {
    renderConProveedores(<Registro />)
    expect(screen.getByText(textos.registro.ayudaContrasena)).toBeInTheDocument()
  })
})
