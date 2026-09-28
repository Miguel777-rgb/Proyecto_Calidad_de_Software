import { ADMIN, USUARIO } from '@ola/compartido/pruebas'
import type { Usuario } from '@ola/compartido/api'
import { SIN_SESION, type Sesion } from '../src/sesion'

export { ADMIN, USUARIO }

/** Respuesta de fetch con cuerpo JSON. */
export function respuesta(cuerpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  } as Response
}

/** Sustituye fetch; cada llamada usa la siguiente respuesta de la lista. */
export function simularFetch(...respuestas: (Response | Error)[]) {
  const fetchSimulado = jest.fn(async () => {
    const siguiente = respuestas.length > 1 ? respuestas.shift()! : respuestas[0]
    if (siguiente instanceof Error) throw siguiente
    return siguiente
  })
  global.fetch = fetchSimulado as unknown as typeof fetch
  return fetchSimulado
}

export function sesionDe(usuario: Usuario | null, sinLeer = 0): Sesion {
  return { ...SIN_SESION, usuario, sinLeer, salir: jest.fn() }
}

type Respuestas = Response | Error | Promise<Response> | (Response | Error | Promise<Response>)[]

/**
 * Sustituye fetch segun la ruta pedida (el final de la URL, sin la raiz de la
 * API). Con una lista, cada llamada usa la siguiente y la ultima se repite.
 * Una ruta sin respuesta responde 404, como FastAPI.
 */
export function simularApi(rutas: Record<string, Respuestas>) {
  const pendientes = Object.fromEntries(
    Object.entries(rutas).map(([ruta, valor]) => [ruta, Array.isArray(valor) ? [...valor] : [valor]]),
  )
  // _init no se usa aqui, pero las pruebas leen el metodo y el cuerpo de cada llamada.
  const fetchSimulado = jest.fn(async (url: string, _init?: RequestInit) => {
    const ruta = new URL(url).pathname.replace(/^\/api/, '')
    const lista = pendientes[ruta]
    if (lista === undefined) return respuesta({ detail: 'Not Found' }, 404)
    const siguiente = lista.length > 1 ? lista.shift()! : lista[0]
    if (siguiente instanceof Error) throw siguiente
    return siguiente
  })
  global.fetch = fetchSimulado as unknown as typeof fetch
  return fetchSimulado
}

/** Una respuesta que llega cuando la prueba lo decide. */
export function respuestaPendiente() {
  let responder: (r: Response) => void = () => {}
  let fallar: (e: Error) => void = () => {}
  const promesa = new Promise<Response>((resolver, rechazar) => {
    responder = resolver
    fallar = rechazar
  })
  return { promesa, responder, fallar }
}

export const CONFIGURACION = {
  threshold_c: '0.5',
  min_streak_records: 5,
  max_gap_days: 2,
  freshness_days: 7,
  map_window_days: 5,
}

export const SIN_RED = new TypeError('Network request failed')
