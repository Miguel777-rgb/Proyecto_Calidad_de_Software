import { ADMIN, USUARIO } from '@ola/compartido/pruebas'
import type { Usuario } from '@ola/compartido/api'
import type { Sesion } from '../src/sesion'

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
  return { usuario, sinLeer, salir: jest.fn() }
}
