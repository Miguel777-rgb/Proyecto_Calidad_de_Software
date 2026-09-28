import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library'
import { ESTADO_MUESTRA, LABORATORIOS, sesionDe as sesionApi } from '@ola/compartido/pruebas'
import { cancelarAutocompletado } from '../modules/autocompletado'
import { olvidarTokenEnMemoria } from '../src/api'
import { ESPERA_REENVIO } from '../src/app/recuperar'
import { abrir } from './app'
import { contenidoSeguro, setItemAsync } from './simulaciones/secureStore'
import { CONFIGURACION, respuesta, simularApi, USUARIO } from './utilidades'

jest.mock('../modules/autocompletado', () => ({ cancelarAutocompletado: jest.fn() }))

const ESTADO = { '/status': respuesta(ESTADO_MUESTRA), '/settings': respuesta(CONFIGURACION) }
const suscripcion = (code: string) => ({
  id: 1,
  laboratory: LABORATORIOS.find((l) => l.code === code)!,
  created_at: '2026-09-27T00:00:00Z',
})

async function conSesionGuardada() {
  await setItemAsync('ola.token', 'token-guardado')
  await setItemAsync('ola.usuario', JSON.stringify(USUARIO))
  olvidarTokenEnMemoria()
}

async function escribir(etiqueta: string, texto: string) {
  await fireEvent.changeText(await screen.findByLabelText(etiqueta), texto)
}

async function pulsar(nombre: string | RegExp, rol: 'button' | 'link' = 'button') {
  await fireEvent.press(await screen.findByRole(rol, { name: nombre }))
}

describe('Entrar', () => {
  it('un correo mal escrito se corrige antes de llamar a la API', async () => {
    const fetchSimulado = simularApi(ESTADO)
    await abrir('/entrar')

    await escribir('Correo electrónico', 'pescador')
    await pulsar('Entrar')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escribe un correo válido, como nombre@ejemplo.pe.',
    )
    expect(fetchSimulado.mock.calls.some(([url]) => String(url).includes('/auth/login'))).toBe(
      false,
    )
  })

  it('desde la banda, al entrar vuelve al mapa con la sesion iniciada', async () => {
    simularApi({ ...ESTADO, '/auth/login': respuesta(sesionApi(USUARIO)) })
    const app = await abrir('/')
    await screen.findByTestId('fecha-referencia')

    await pulsar('Entrar')
    await escribir('Correo electrónico', 'pescador@ejemplo.pe')
    await escribir('Contraseña', 'miclave123')
    await fireEvent.press(screen.getByTestId('entrar-enviar'))

    await waitFor(() => expect(app.ruta()).toBe('/'))
    expect(await screen.findByRole('button', { name: 'Menú de cuenta' })).toBeOnTheScreen()
  })

  it('desde una zona, al entrar vuelve a esa zona y ofrece recibir avisos', async () => {
    simularApi({
      ...ESTADO,
      '/auth/login': respuesta(sesionApi(USUARIO)),
      '/subscriptions': respuesta([]),
    })
    const app = await abrir('/zona/CALLAO')

    await pulsar('Entra para recibir avisos')
    await waitFor(() => expect(app.ruta()).toBe('/entrar'))
    await escribir('Correo electrónico', 'pescador@ejemplo.pe')
    await escribir('Contraseña', 'miclave123')
    await fireEvent.press(screen.getByTestId('entrar-enviar'))

    await waitFor(() => expect(app.ruta()).toBe('/zona/CALLAO'))
    expect(await screen.findByRole('button', { name: 'Recibir avisos de Callao' })).toBeOnTheScreen()
  })

  it('una clave equivocada muestra el mensaje del backend', async () => {
    simularApi({ ...ESTADO, '/auth/login': respuesta({ detail: 'Correo o contraseña incorrectos.' }, 401) })
    await abrir('/entrar')

    await escribir('Correo electrónico', 'pescador@ejemplo.pe')
    await escribir('Contraseña', 'otra')
    await fireEvent.press(screen.getByTestId('entrar-enviar'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
  })

  it('si la sesion termino lo explica', async () => {
    simularApi(ESTADO)
    await abrir('/entrar?motivo=sesion')

    expect(await screen.findByText('Tu sesión terminó. Vuelve a entrar.')).toBeOnTheScreen()
  })

  it('el ojo muestra y oculta la contraseña', async () => {
    simularApi(ESTADO)
    await abrir('/entrar')
    const campo = await screen.findByLabelText('Contraseña')
    expect(campo.props.secureTextEntry).toBe(true)

    await pulsar('Mostrar contraseña')

    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false)
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeOnTheScreen()
  })

  it('los campos no usan el autocompletado de Android', async () => {
    simularApi(ESTADO)
    await abrir('/entrar')

    const correo = await screen.findByLabelText('Correo electrónico')
    expect(correo.props).toMatchObject({ autoComplete: 'off', importantForAutofill: 'no' })

    // Desde Android 14 eso no basta: al enfocar un campo se cancela la sesion
    // que el sistema abre igual (D-32).
    jest.mocked(cancelarAutocompletado).mockClear()
    await fireEvent(correo, 'focus')
    await fireEvent(screen.getByLabelText('Contraseña'), 'focus')
    expect(cancelarAutocompletado).toHaveBeenCalledTimes(2)

    // Y al dejar la pantalla, que es cuando el celular ofrece guardar.
    jest.mocked(cancelarAutocompletado).mockClear()
    await pulsar('Crear una cuenta', 'link')
    await waitFor(() => expect(cancelarAutocompletado).toHaveBeenCalledTimes(1))
  })
})

describe('Crear cuenta', () => {
  it('se llega desde Entrar y una contraseña corta se avisa al instante', async () => {
    simularApi(ESTADO)
    const app = await abrir('/entrar')

    await pulsar('Crear una cuenta', 'link')
    await waitFor(() => expect(app.ruta()).toBe('/registro'))
    await escribir('Correo electrónico', 'nueva@ejemplo.pe')
    await escribir('Contraseña', 'corta')
    await fireEvent.press(screen.getByTestId('registro-enviar'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña debe tener al menos 8 caracteres.',
    )
  })

  it('un correo mal escrito se corrige antes de llamar a la API', async () => {
    const fetchSimulado = simularApi(ESTADO)
    await abrir('/registro')

    await escribir('Correo electrónico', 'sin-arroba')
    await escribir('Contraseña', 'miclave123')
    await fireEvent.press(screen.getByTestId('registro-enviar'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escribe un correo válido, como nombre@ejemplo.pe.',
    )
    expect(fetchSimulado.mock.calls.some(([url]) => String(url).endsWith('/register'))).toBe(false)
  })

  it('un correo ya registrado muestra el mensaje del backend', async () => {
    simularApi({
      ...ESTADO,
      '/auth/register': respuesta({ detail: 'Ya existe una cuenta registrada con ese correo.' }, 409),
    })
    await abrir('/registro')

    await escribir('Correo electrónico', 'pescador@ejemplo.pe')
    await escribir('Contraseña', 'miclave123')
    await fireEvent.press(screen.getByTestId('registro-enviar'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe una cuenta registrada con ese correo.',
    )
  })

  it('al crearla queda la sesion iniciada y se cierran las pantallas de cuenta', async () => {
    simularApi({ ...ESTADO, '/auth/register': respuesta(sesionApi(USUARIO), 201) })
    const app = await abrir('/entrar')
    await pulsar('Crear una cuenta', 'link')

    await escribir('Correo electrónico', 'nueva@ejemplo.pe')
    await escribir('Nombre completo', 'Rosa Quispe')
    await escribir('Contraseña', 'miclave123')
    await fireEvent.press(screen.getByTestId('registro-enviar'))

    await waitFor(() => expect(app.ruta()).toBe('/'))
    expect(contenidoSeguro().get('ola.token')).toBe('token-de-prueba')
  })
})

describe('Recuperar contraseña', () => {
  it('trae el correo escrito en Entrar y explica que el codigo va al correo', async () => {
    const fetchSimulado = simularApi({
      ...ESTADO,
      '/auth/password-reset/request': respuesta(
        { detail: 'Si ese correo tiene cuenta, te enviamos un código.' },
        202,
      ),
    })
    const app = await abrir('/entrar')
    await escribir('Correo electrónico', 'pescador@ejemplo.pe')

    await pulsar('¿Olvidaste tu contraseña?', 'link')
    await waitFor(() => expect(app.ruta()).toBe('/recuperar'))
    expect(screen.getByLabelText('Correo electrónico').props.value).toBe('pescador@ejemplo.pe')
    await fireEvent.press(screen.getByTestId('enviar-codigo'))

    expect(await screen.findByTestId('codigo-enviado')).toHaveTextContent(
      'Si pescador@ejemplo.pe tiene cuenta, te enviamos un código. Vale 15 minutos.',
    )
    expect(screen.getByText(`Puedes pedir otro código en ${ESPERA_REENVIO} s`)).toBeOnTheScreen()
    expect(fetchSimulado.mock.calls.some(([url]) => String(url).endsWith('/request'))).toBe(true)
  })

  it('con el codigo y la contraseña nueva queda dentro', async () => {
    simularApi({
      ...ESTADO,
      '/auth/password-reset/request': respuesta({ detail: 'ok' }, 202),
      '/auth/password-reset/confirm': respuesta(sesionApi(USUARIO)),
    })
    const app = await abrir('/recuperar?correo=pescador%40ejemplo.pe')
    await fireEvent.press(await screen.findByTestId('enviar-codigo'))

    await escribir('Código de 6 dígitos', '482 913')
    expect(screen.getByLabelText('Código de 6 dígitos').props.value).toBe('482913')
    await escribir('Contraseña nueva', 'otra clave larga')
    await fireEvent.press(screen.getByTestId('cambiar-contrasena'))

    await waitFor(() => expect(contenidoSeguro().get('ola.token')).toBe('token-de-prueba'))
    await waitFor(() => expect(app.ruta()).toBe('/'))
  })

  it('un codigo incompleto o vencido se explica', async () => {
    simularApi({
      ...ESTADO,
      '/auth/password-reset/request': respuesta({ detail: 'ok' }, 202),
      '/auth/password-reset/confirm': respuesta({ detail: 'El código no es válido o ya venció.' }, 400),
    })
    await abrir('/recuperar?correo=pescador%40ejemplo.pe')
    await fireEvent.press(await screen.findByTestId('enviar-codigo'))

    await escribir('Código de 6 dígitos', '4829')
    await escribir('Contraseña nueva', 'otra clave larga')
    await fireEvent.press(screen.getByTestId('cambiar-contrasena'))
    expect(await screen.findByRole('alert')).toHaveTextContent('El código tiene 6 dígitos.')

    await escribir('Código de 6 dígitos', '482913')
    await fireEvent.press(screen.getByTestId('cambiar-contrasena'))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('El código no es válido o ya venció.'),
    )
  })

  it('un correo mal escrito o una contraseña corta se avisan antes de llamar a la API', async () => {
    const fetchSimulado = simularApi({
      ...ESTADO,
      '/auth/password-reset/request': respuesta({ detail: 'ok' }, 202),
    })
    await abrir('/recuperar')
    const llamadas = (ruta: string) =>
      fetchSimulado.mock.calls.filter(([url]) => String(url).endsWith(ruta)).length

    await escribir('Correo electrónico', 'sin-arroba')
    await fireEvent.press(screen.getByTestId('enviar-codigo'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escribe un correo válido, como nombre@ejemplo.pe.',
    )
    expect(llamadas('/request')).toBe(0)

    await escribir('Correo electrónico', 'pescador@ejemplo.pe')
    await fireEvent.press(screen.getByTestId('enviar-codigo'))
    await screen.findByTestId('codigo-enviado')
    await escribir('Código de 6 dígitos', '482913')
    await escribir('Contraseña nueva', 'corta')
    await fireEvent.press(screen.getByTestId('cambiar-contrasena'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña debe tener al menos 8 caracteres.',
    )
    expect(llamadas('/confirm')).toBe(0)
  })

  it('si no se pudo pedir el codigo, lo dice y deja reintentar', async () => {
    simularApi({
      ...ESTADO,
      '/auth/password-reset/request': respuesta({ detail: 'Error interno del servidor.' }, 500),
    })
    await abrir('/recuperar?correo=pescador%40ejemplo.pe')

    await fireEvent.press(await screen.findByTestId('enviar-codigo'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor.')
    expect(screen.getByTestId('enviar-codigo')).toBeOnTheScreen()
  })

  it('pasado un minuto ofrece enviar otro codigo', async () => {
    jest.useFakeTimers()
    try {
      const fetchSimulado = simularApi({
        ...ESTADO,
        '/auth/password-reset/request': respuesta({ detail: 'ok' }, 202),
      })
      await abrir('/recuperar?correo=pescador%40ejemplo.pe')
      await fireEvent.press(await screen.findByTestId('enviar-codigo'))
      await screen.findByTestId('espera-codigo')

      for (let s = 0; s < ESPERA_REENVIO; s += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1000)
        })
      }
      await fireEvent.press(screen.getByRole('link', { name: 'Enviar otro código' }))

      await waitFor(() =>
        expect(fetchSimulado.mock.calls.filter(([url]) => String(url).endsWith('/request'))).toHaveLength(2),
      )
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('Mis zonas', () => {
  it('sin sesion invita a entrar y vuelve a Mis zonas', async () => {
    simularApi(ESTADO)
    const app = await abrir('/mis-zonas')

    expect(
      await screen.findByText('Inicia sesión para elegir tus zonas de interés y recibir avisos.'),
    ).toBeOnTheScreen()
    await fireEvent.press(screen.getByTestId('mis-zonas-entrar'))

    await waitFor(() => expect(app.ruta()).toBe('/entrar'))
  })

  it('con sesion lista cada zona con su estado y un interruptor', async () => {
    await conSesionGuardada()
    simularApi({ ...ESTADO, '/auth/me': respuesta(USUARIO), '/subscriptions': respuesta([suscripcion('CALLAO')]) })
    await abrir('/mis-zonas')

    await screen.findByTestId('lista-zonas')
    for (const zona of ESTADO_MUESTRA.zones) {
      expect(screen.getByTestId(`seguir-${zona.laboratory.code}`)).toBeOnTheScreen()
    }
    expect(screen.getByLabelText('Callao, cálido, en alerta').props.value).toBe(true)
    expect(screen.getByLabelText('Huacho, cálido').props.value).toBe(false)
    expect(screen.getByLabelText('Matarani, sin datos recientes')).toBeOnTheScreen()
  })

  it('el interruptor suscribe a la zona', async () => {
    await conSesionGuardada()
    const fetchSimulado = simularApi({
      ...ESTADO,
      '/auth/me': respuesta(USUARIO),
      '/subscriptions': [respuesta([]), respuesta(suscripcion('HUACHO'), 201)],
    })
    await abrir('/mis-zonas')
    await screen.findByTestId('lista-zonas')

    await fireEvent(screen.getByLabelText('Huacho, cálido'), 'valueChange', true)

    await waitFor(() => expect(screen.getByLabelText('Huacho, cálido').props.value).toBe(true))
    const post = fetchSimulado.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(JSON.parse(String((post?.[1] as RequestInit).body))).toEqual({ laboratory_code: 'HUACHO' })
  })

  it('si la sesion vencio, lleva a Entrar con el aviso', async () => {
    await conSesionGuardada()
    simularApi({
      ...ESTADO,
      '/auth/me': respuesta(USUARIO),
      '/subscriptions': respuesta({ detail: 'Credenciales inválidas o sesión expirada.' }, 401),
    })
    const app = await abrir('/mis-zonas')

    await waitFor(() => expect(app.ruta()).toBe('/entrar'))
    expect(await screen.findByText('Tu sesión terminó. Vuelve a entrar.')).toBeOnTheScreen()
    expect(contenidoSeguro().has('ola.token')).toBe(false)
  })
})

describe('Avisos desde el detalle', () => {
  it('con sesion, recibir avisos suscribe y se puede dejar de recibir', async () => {
    await conSesionGuardada()
    simularApi({
      ...ESTADO,
      '/auth/me': respuesta(USUARIO),
      '/subscriptions': [respuesta([]), respuesta(suscripcion('CALLAO'), 201)],
      '/subscriptions/CALLAO': respuesta(null, 204),
    })
    await abrir('/zona/CALLAO')

    await pulsar('Recibir avisos de Callao')
    expect(await screen.findByText('Recibes avisos de Callao')).toBeOnTheScreen()

    await pulsar('Dejar de recibir')
    expect(await screen.findByRole('button', { name: 'Recibir avisos de Callao' })).toBeOnTheScreen()
  })

  it('una zona que ya no mide no ofrece avisos aunque haya sesion', async () => {
    await conSesionGuardada()
    simularApi({ ...ESTADO, '/auth/me': respuesta(USUARIO), '/subscriptions': respuesta([]) })
    await abrir('/zona/MATARANI')

    await screen.findByRole('header', { name: 'Matarani' })
    expect(screen.queryByRole('button', { name: /avisos/ })).toBeNull()
  })
})
