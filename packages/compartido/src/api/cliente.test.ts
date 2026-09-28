import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  crearCliente,
  extraerMensaje,
  type AlmacenToken,
  type ClienteOla,
} from './cliente'

function almacenSincrono(token: string | null = null): AlmacenToken {
  let valor = token
  return {
    get: () => valor,
    set: (nuevo) => {
      valor = nuevo
    },
    clear: () => {
      valor = null
    },
  }
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

function simularFetch(respuesta: () => Response) {
  const fetchSimulado = vi.fn<typeof fetch>(async () => respuesta())
  vi.stubGlobal('fetch', fetchSimulado)
  return fetchSimulado
}

const cabeceras = (llamada: unknown[]) => (llamada[1] as RequestInit).headers as Record<string, string>

describe('crearCliente', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envia el token guardado como Bearer', async () => {
    const fetchSimulado = simularFetch(() => json({ status: 'ok' }))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono('abc') })

    await cliente.getHealth()

    expect(cabeceras(fetchSimulado.mock.calls[0])).toMatchObject({ Authorization: 'Bearer abc' })
  })

  it('sin token no envia la cabecera de autorizacion', async () => {
    const fetchSimulado = simularFetch(() => json({ status: 'ok' }))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono() })

    await cliente.getHealth()

    expect(cabeceras(fetchSimulado.mock.calls[0])).not.toHaveProperty('Authorization')
  })

  it('acepta un almacen que responde con promesas, como el de la app movil', async () => {
    const fetchSimulado = simularFetch(() => json({ status: 'ok' }))
    const almacen: AlmacenToken = {
      get: async () => 'desde-el-celular',
      set: async () => {},
      clear: async () => {},
    }
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacen })

    await cliente.getHealth()

    expect(cabeceras(fetchSimulado.mock.calls[0])).toMatchObject({
      Authorization: 'Bearer desde-el-celular',
    })
  })

  it('con un almacen sincrono la peticion sale sin esperar', () => {
    const fetchSimulado = simularFetch(() => json({ status: 'ok' }))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono('abc') })

    void cliente.getHealth()

    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('antepone la raiz completa de la API', async () => {
    const fetchSimulado = simularFetch(() => json([]))
    const cliente = crearCliente({
      baseUrl: 'http://10.0.2.2:8000/api',
      almacenToken: almacenSincrono(),
    })

    await cliente.listarLaboratorios()

    expect(fetchSimulado.mock.calls[0][0]).toBe('http://10.0.2.2:8000/api/laboratories')
  })

  it('arma los parametros de la comparacion y codifica el codigo de zona', async () => {
    const fetchSimulado = simularFetch(() => json({}))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono() })

    await cliente.compararSeries(['CALLAO', 'SAN JOSE'], '2026-01-01', '2026-07-31')
    await cliente.obtenerSerie('SAN JOSE')

    expect(fetchSimulado.mock.calls[0][0]).toBe(
      '/api/readings/compare?labs=CALLAO%2CSAN+JOSE&from=2026-01-01&to=2026-07-31',
    )
    expect(fetchSimulado.mock.calls[1][0]).toBe('/api/laboratories/SAN%20JOSE/readings')
  })

  it('convierte un error de FastAPI en ApiError con su estado', async () => {
    simularFetch(() => json({ detail: 'Credenciales incorrectas' }, 401))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono() })

    const error = await cliente.iniciarSesion({ email: 'a@b.pe', password: 'x' }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ message: 'Credenciales incorrectas', status: 401 })
  })

  it('usa un mensaje de respaldo si el error no trae cuerpo JSON', async () => {
    simularFetch(() => new Response('Bad Gateway', { status: 502 }))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono() })

    await expect(cliente.obtenerEstado()).rejects.toMatchObject({
      message: 'Error 502 al llamar a /status',
      status: 502,
    })
  })

  it('una respuesta 204 no intenta leer un cuerpo', async () => {
    simularFetch(() => new Response(null, { status: 204 }))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono('abc') })

    await expect(cliente.darseDeBaja('CALLAO')).resolves.toBeUndefined()
  })

  it('al importar deja que el formulario multipart fije su propio Content-Type', async () => {
    const fetchSimulado = simularFetch(() => json({ id: 1 }, 201))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono('abc') })

    await cliente.importarCsv(new Blob(['FECHA_MEDICION\n'], { type: 'text/csv' }))

    const init = fetchSimulado.mock.calls[0][1] as RequestInit
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.headers).toEqual({ Authorization: 'Bearer abc' })
  })
})

/**
 * El contrato con el backend: cada funcion pide la ruta y el metodo que
 * FastAPI espera. Si una ruta cambia en un lado y no en el otro, la web y la
 * app fallarian a la vez; esta tabla lo detecta antes.
 */
describe('sesion que termina', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('avisa cuando una peticion con token recibe 401', async () => {
    simularFetch(() => json({ detail: 'Credenciales inválidas o sesión expirada.' }, 401))
    const alNoAutorizado = vi.fn()
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono('abc'), alNoAutorizado })

    await expect(cliente.listarSuscripciones()).rejects.toMatchObject({ status: 401 })

    expect(alNoAutorizado).toHaveBeenCalledTimes(1)
  })

  it('sin token, un 401 es una clave equivocada y no avisa', async () => {
    simularFetch(() => json({ detail: 'Correo o contraseña incorrectos.' }, 401))
    const alNoAutorizado = vi.fn()
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono(null), alNoAutorizado })

    await expect(cliente.iniciarSesion({ email: 'a@b.pe', password: 'x' })).rejects.toThrow(
      'Correo o contraseña incorrectos.',
    )

    expect(alNoAutorizado).not.toHaveBeenCalled()
  })

  it('un 403 no cierra la sesion', async () => {
    simularFetch(() => json({ detail: 'Esta acción requiere permisos de administrador.' }, 403))
    const alNoAutorizado = vi.fn()
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono('abc'), alNoAutorizado })

    await expect(cliente.listarImportaciones()).rejects.toMatchObject({ status: 403 })

    expect(alNoAutorizado).not.toHaveBeenCalled()
  })
})

describe('sesion larga y codigo de recuperacion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('la app pide la sesion larga en el cuerpo al entrar', async () => {
    const fetchSimulado = simularFetch(() => json({}))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono() })

    await cliente.iniciarSesion({ email: 'a@b.pe', password: 'miclave123', mantener_sesion: true })

    expect(JSON.parse(String((fetchSimulado.mock.calls[0][1] as RequestInit).body))).toEqual({
      email: 'a@b.pe',
      password: 'miclave123',
      mantener_sesion: true,
    })
  })

  it('pedir el codigo solo manda el correo', async () => {
    const fetchSimulado = simularFetch(() => json({ detail: 'Si ese correo tiene cuenta, te enviamos un código.' }, 202))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono() })

    const respuesta = await cliente.pedirCodigo('a@b.pe')

    expect(JSON.parse(String((fetchSimulado.mock.calls[0][1] as RequestInit).body))).toEqual({
      email: 'a@b.pe',
    })
    expect(respuesta.detail).toMatch(/te enviamos un código/)
  })

  it('un codigo vencido llega como mensaje legible', async () => {
    simularFetch(() => json({ detail: 'El código no es válido o ya venció.' }, 400))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono() })

    await expect(
      cliente.cambiarContrasena({ email: 'a@b.pe', code: '000000', password: 'miclave123' }),
    ).rejects.toThrow('El código no es válido o ya venció.')
  })
})

describe('rutas de la API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const CASOS: { nombre: keyof ClienteOla; args: unknown[]; metodo: string; ruta: string }[] = [
    { nombre: 'getHealth', args: [], metodo: 'GET', ruta: '/api/health/ready' },
    {
      nombre: 'registrar',
      args: [{ email: 'a@b.pe', password: 'miclave123' }],
      metodo: 'POST',
      ruta: '/api/auth/register',
    },
    {
      nombre: 'iniciarSesion',
      args: [{ email: 'a@b.pe', password: 'miclave123' }],
      metodo: 'POST',
      ruta: '/api/auth/login',
    },
    { nombre: 'obtenerPerfil', args: [], metodo: 'GET', ruta: '/api/auth/me' },
    {
      nombre: 'pedirCodigo',
      args: ['a@b.pe'],
      metodo: 'POST',
      ruta: '/api/auth/password-reset/request',
    },
    {
      nombre: 'cambiarContrasena',
      args: [{ email: 'a@b.pe', code: '482913', password: 'miclave123' }],
      metodo: 'POST',
      ruta: '/api/auth/password-reset/confirm',
    },
    { nombre: 'listarLaboratorios', args: [], metodo: 'GET', ruta: '/api/laboratories' },
    { nombre: 'listarImportaciones', args: [], metodo: 'GET', ruta: '/api/imports' },
    { nombre: 'obtenerEstado', args: [], metodo: 'GET', ruta: '/api/status' },
    {
      nombre: 'obtenerEstado',
      args: ['2026-07-31'],
      metodo: 'GET',
      ruta: '/api/status?as_of=2026-07-31',
    },
    { nombre: 'obtenerConfiguracion', args: [], metodo: 'GET', ruta: '/api/settings' },
    {
      nombre: 'guardarConfiguracion',
      args: [{ threshold_c: '0.6' }],
      metodo: 'PUT',
      ruta: '/api/settings',
    },
    { nombre: 'evaluarAlertas', args: [], metodo: 'POST', ruta: '/api/alerts/evaluate' },
    { nombre: 'listarAlertas', args: [], metodo: 'GET', ruta: '/api/alerts' },
    {
      nombre: 'listarAlertas',
      args: [{ lab: 'CALLAO', soloVigentes: true }],
      metodo: 'GET',
      ruta: '/api/alerts?lab=CALLAO&only_open=true',
    },
    {
      nombre: 'obtenerProyeccion',
      args: ['PISCO', 7],
      metodo: 'GET',
      ruta: '/api/laboratories/PISCO/projection?horizon=7',
    },
    { nombre: 'listarSuscripciones', args: [], metodo: 'GET', ruta: '/api/subscriptions' },
    { nombre: 'suscribirse', args: ['ILO'], metodo: 'POST', ruta: '/api/subscriptions' },
    { nombre: 'listarAvisos', args: [], metodo: 'GET', ruta: '/api/notifications' },
    { nombre: 'marcarAvisoLeido', args: [5], metodo: 'POST', ruta: '/api/notifications/5/read' },
    { nombre: 'marcarTodosLeidos', args: [], metodo: 'POST', ruta: '/api/notifications/read-all' },
    {
      nombre: 'enviarAvisosPendientes',
      args: [],
      metodo: 'POST',
      ruta: '/api/notifications/send',
    },
  ]

  it.each(CASOS)('$nombre pide $metodo $ruta', async ({ nombre, args, metodo, ruta }) => {
    const fetchSimulado = simularFetch(() => json({}))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono() })
    const funcion = cliente[nombre] as (...argumentos: unknown[]) => Promise<unknown>

    await funcion(...args)

    const [url, init] = fetchSimulado.mock.calls[0]
    expect(url).toBe(ruta)
    expect(init?.method ?? 'GET').toBe(metodo)
  })

  it('el cuerpo de suscribirse lleva el codigo de zona que espera FastAPI', async () => {
    const fetchSimulado = simularFetch(() => json({}, 201))
    const cliente = crearCliente({ baseUrl: '/api', almacenToken: almacenSincrono('abc') })

    await cliente.suscribirse('SAN JOSE')

    expect(JSON.parse(String(fetchSimulado.mock.calls[0][1]?.body))).toEqual({
      laboratory_code: 'SAN JOSE',
    })
  })
})

describe('extraerMensaje', () => {
  it('toma el primer mensaje de los errores de validacion de Pydantic', () => {
    const cuerpo = { detail: [{ msg: 'La contraseña es muy corta' }, { msg: 'otro' }] }
    expect(extraerMensaje(cuerpo, 'respaldo')).toBe('La contraseña es muy corta')
  })

  it('devuelve el respaldo ante cuerpos que no reconoce', () => {
    expect(extraerMensaje(null, 'respaldo')).toBe('respaldo')
    expect(extraerMensaje({ detail: [] }, 'respaldo')).toBe('respaldo')
    expect(extraerMensaje({ otro: 'campo' }, 'respaldo')).toBe('respaldo')
  })
})
