import { act, renderHook, waitFor } from '@testing-library/react-native'
import { sesionDe as sesionApi } from '@ola/compartido/pruebas'
import type { ReactNode } from 'react'
import { contenidoSeguro, setItemAsync } from '../pruebas/simulaciones/secureStore'
import { respuesta, SIN_RED, simularApi, USUARIO } from '../pruebas/utilidades'
import { api, olvidarTokenEnMemoria } from './api'
import { ProveedorSesion, useSesion } from './sesion'

function conSesionReal({ children }: { children: ReactNode }) {
  return <ProveedorSesion>{children}</ProveedorSesion>
}

async function abrir() {
  return renderHook(() => useSesion(), { wrapper: conSesionReal })
}

/** Una sesion que quedo guardada en el celular la vez anterior. */
async function sesionGuardada() {
  await setItemAsync('ola.token', 'token-guardado')
  await setItemAsync('ola.usuario', JSON.stringify(USUARIO))
  olvidarTokenEnMemoria()
}

const cuerpo = (fetchSimulado: jest.Mock, ruta: string) =>
  JSON.parse(
    String(
      (fetchSimulado.mock.calls.find(([url]) => String(url).endsWith(ruta))?.[1] as RequestInit)
        .body,
    ),
  )

describe('sesion de la app', () => {
  it('sin nada guardado abre sin sesion', async () => {
    simularApi({})
    const { result } = await abrir()

    await waitFor(() => expect(result.current.cargando).toBe(false))
    expect(result.current.usuario).toBeNull()
  })

  it('con una sesion guardada la muestra y la confirma con la API', async () => {
    await sesionGuardada()
    const fetchSimulado = simularApi({ '/auth/me': respuesta({ ...USUARIO, full_name: 'Juan' }) })
    const { result } = await abrir()

    await waitFor(() => expect(result.current.usuario?.full_name).toBe('Juan'))
    expect(fetchSimulado).toHaveBeenCalledWith(
      'http://localhost:18000/api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-guardado' }),
      }),
    )
  })

  it('sin conexion al abrir conserva la sesion guardada', async () => {
    await sesionGuardada()
    simularApi({ '/auth/me': SIN_RED })
    const { result } = await abrir()

    await waitFor(() => expect(result.current.cargando).toBe(false))
    await act(async () => {})
    expect(result.current.usuario?.email).toBe(USUARIO.email)
    expect(contenidoSeguro().get('ola.token')).toBe('token-guardado')
  })

  it('si la sesion vencio con la app cerrada, la cierra sin avisar', async () => {
    await sesionGuardada()
    simularApi({ '/auth/me': respuesta({ detail: 'Credenciales inválidas o sesión expirada.' }, 401) })
    const { result } = await abrir()

    await waitFor(() => expect(contenidoSeguro().has('ola.token')).toBe(false))
    expect(result.current.usuario).toBeNull()
    expect(result.current.sesionTermino).toBe(false)
  })

  it('entrar pide la sesion de 30 dias y guarda token y usuario cifrados', async () => {
    const fetchSimulado = simularApi({ '/auth/login': respuesta(sesionApi(USUARIO)) })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.cargando).toBe(false))

    await act(async () => result.current.entrar('pescador@ejemplo.pe', 'miclave123'))

    expect(cuerpo(fetchSimulado, '/auth/login')).toEqual({
      email: 'pescador@ejemplo.pe',
      password: 'miclave123',
      mantener_sesion: true,
    })
    expect(result.current.usuario?.email).toBe(USUARIO.email)
    expect(contenidoSeguro().get('ola.token')).toBe('token-de-prueba')
    expect(JSON.parse(contenidoSeguro().get('ola.usuario')!).email).toBe(USUARIO.email)
  })

  it('una clave equivocada no guarda nada y deja ver el mensaje', async () => {
    simularApi({ '/auth/login': respuesta({ detail: 'Correo o contraseña incorrectos.' }, 401) })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.cargando).toBe(false))

    await expect(
      act(async () => result.current.entrar('pescador@ejemplo.pe', 'otra')),
    ).rejects.toThrow('Correo o contraseña incorrectos.')
    expect(contenidoSeguro().has('ola.token')).toBe(false)
    expect(result.current.sesionTermino).toBe(false)
  })

  it('crear la cuenta manda el nombre solo si lo hay', async () => {
    const fetchSimulado = simularApi({ '/auth/register': respuesta(sesionApi(USUARIO), 201) })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.cargando).toBe(false))

    await act(async () => result.current.registrarse('nueva@ejemplo.pe', 'miclave123'))

    expect(cuerpo(fetchSimulado, '/auth/register')).toEqual({
      email: 'nueva@ejemplo.pe',
      password: 'miclave123',
      mantener_sesion: true,
    })
    expect(result.current.usuario).not.toBeNull()
  })

  it('cambiar la contraseña con el codigo deja la sesion iniciada', async () => {
    const fetchSimulado = simularApi({
      '/auth/password-reset/confirm': respuesta(sesionApi(USUARIO)),
    })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.cargando).toBe(false))

    await act(async () => result.current.restablecer('pescador@ejemplo.pe', '482913', 'nueva clave'))

    expect(cuerpo(fetchSimulado, '/auth/password-reset/confirm')).toEqual({
      email: 'pescador@ejemplo.pe',
      code: '482913',
      password: 'nueva clave',
      mantener_sesion: true,
    })
    expect(result.current.usuario?.email).toBe(USUARIO.email)
  })

  it('salir borra el token y el usuario del celular', async () => {
    await sesionGuardada()
    simularApi({ '/auth/me': respuesta(USUARIO) })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.usuario).not.toBeNull())

    await act(async () => result.current.salir())

    expect(result.current.usuario).toBeNull()
    expect(contenidoSeguro().size).toBe(0)
  })

  it('si la API rechaza el token a mitad de uso, cierra la sesion y lo avisa', async () => {
    await sesionGuardada()
    simularApi({
      '/auth/me': respuesta(USUARIO),
      '/subscriptions': respuesta({ detail: 'Credenciales inválidas o sesión expirada.' }, 401),
    })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.usuario).not.toBeNull())
    await act(async () => {})

    await act(async () => {
      await api.listarSuscripciones().catch(() => {})
    })

    expect(result.current.sesionTermino).toBe(true)
    expect(result.current.usuario).toBeNull()
    expect(contenidoSeguro().has('ola.token')).toBe(false)

    await act(async () => result.current.olvidarSesionTermino())
    expect(result.current.sesionTermino).toBe(false)
  })

  it('entrar de nuevo despues de un aviso lo olvida', async () => {
    simularApi({ '/auth/login': respuesta(sesionApi(USUARIO)) })
    const { result } = await abrir()
    await waitFor(() => expect(result.current.cargando).toBe(false))

    await act(async () => result.current.entrar('pescador@ejemplo.pe', 'miclave123'))

    expect(result.current.sesionTermino).toBe(false)
  })
})
