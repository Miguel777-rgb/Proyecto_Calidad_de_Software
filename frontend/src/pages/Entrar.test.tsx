import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Entrar from './Entrar'
import { textos } from '../i18n/textos'
import { USUARIO, renderConProveedores, respuesta, sesionDe } from '../test-utils'

async function enviarFormulario(correo = 'pescador@ejemplo.pe', clave = 'miclave123') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(textos.comun.correo), correo)
  await user.type(screen.getByLabelText(textos.comun.contrasena), clave)
  await user.click(screen.getByRole('button', { name: textos.entrar.boton }))
}

describe('Entrar', () => {
  it('guarda el token al iniciar sesion correctamente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(sesionDe(USUARIO))))
    renderConProveedores(<Entrar />)
    await enviarFormulario()
    expect(localStorage.getItem('ola.token')).toBe('token-de-prueba')
  })

  it('muestra el mensaje del servidor cuando las credenciales son incorrectas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta({ detail: 'Correo o contrasena incorrectos.' }, 401)),
    )
    renderConProveedores(<Entrar />)
    await enviarFormulario(undefined, 'incorrecta')

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contrasena incorrectos.')
    expect(localStorage.getItem('ola.token')).toBeNull()
  })

  it('no deja la sesion iniciada si la cuenta esta desactivada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta({ detail: 'La cuenta esta desactivada.' }, 403)),
    )
    renderConProveedores(<Entrar />)
    await enviarFormulario()
    expect(await screen.findByRole('alert')).toHaveTextContent('desactivada')
    expect(localStorage.getItem('ola.token')).toBeNull()
  })

  it('enlaza con la pagina de registro', () => {
    renderConProveedores(<Entrar />)
    expect(screen.getByRole('link', { name: textos.entrar.crearla })).toHaveAttribute(
      'href',
      '/registro',
    )
  })
})
