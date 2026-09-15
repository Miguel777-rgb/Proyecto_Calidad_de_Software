import type {
  Configuracion,
  Episodio,
  EstadoSistema,
  HealthResponse,
  Importacion,
  Laboratorio,
  ListaAvisos,
  Proyeccion,
  RespuestaSeries,
  ResumenEnvio,
  ResumenEvaluacion,
  Sesion,
  Suscripcion,
  Usuario,
} from './tipos'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Donde vive el token de sesion.
 *
 * La web usa localStorage, que responde al instante. La app movil usa el
 * almacenamiento cifrado de Android, que responde con una promesa. El
 * cliente acepta los dos.
 */
export interface AlmacenToken {
  get(): string | null | Promise<string | null>
  set(token: string): void | Promise<void>
  clear(): void | Promise<void>
}

export interface OpcionesCliente {
  /** Raiz de la API sin barra final: `/api` en la web, una URL completa en la app. */
  baseUrl: string
  almacenToken: AlmacenToken
}

/** Mensaje legible a partir del cuerpo de error de FastAPI. */
export function extraerMensaje(cuerpo: unknown, respaldo: string): string {
  if (typeof cuerpo !== 'object' || cuerpo === null || !('detail' in cuerpo)) return respaldo
  const detail = (cuerpo as { detail: unknown }).detail
  if (typeof detail === 'string') return detail
  // Errores de validacion de Pydantic: llegan como lista de objetos.
  if (Array.isArray(detail) && detail.length > 0) {
    const primero = detail[0] as { msg?: unknown }
    if (typeof primero.msg === 'string') return primero.msg
  }
  return respaldo
}

function rangoQuery(desde?: string, hasta?: string): string {
  const query = new URLSearchParams()
  if (desde) query.set('from', desde)
  if (hasta) query.set('to', hasta)
  const cadena = query.toString()
  return cadena ? `?${cadena}` : ''
}

async function leerCuerpo(respuesta: Response): Promise<unknown> {
  try {
    return await respuesta.json()
  } catch {
    // Respuesta sin cuerpo JSON.
    return null
  }
}

export function crearCliente({ baseUrl, almacenToken }: OpcionesCliente) {
  async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    // Con un almacen sincrono no se espera nada antes de pedir: la peticion
    // sale en el mismo instante en que se llama, como en la web original.
    const leido = almacenToken.get()
    const token = typeof leido === 'string' || leido === null ? leido : await leido

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      throw new ApiError(
        extraerMensaje(await leerCuerpo(response), `Error ${response.status} al llamar a ${path}`),
        response.status,
      )
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  /** Envia el CSV. No fija Content-Type: quien arma el formulario multipart
   *  debe generar su propio limite. */
  async function importarCsv(archivo: Blob): Promise<Importacion> {
    const cuerpo = new FormData()
    cuerpo.append('file', archivo)
    const token = await almacenToken.get()

    const respuesta = await fetch(`${baseUrl}/imports`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: cuerpo,
    })

    const datos = await leerCuerpo(respuesta)
    if (!respuesta.ok) {
      throw new ApiError(
        extraerMensaje(datos, `Error ${respuesta.status} al importar el archivo`),
        respuesta.status,
      )
    }
    return datos as Importacion
  }

  return {
    apiFetch,
    importarCsv,

    getHealth: () => apiFetch<HealthResponse>('/health/ready'),

    registrar: (datos: { email: string; password: string; full_name?: string }) =>
      apiFetch<Sesion>('/auth/register', { method: 'POST', body: JSON.stringify(datos) }),

    iniciarSesion: (datos: { email: string; password: string }) =>
      apiFetch<Sesion>('/auth/login', { method: 'POST', body: JSON.stringify(datos) }),

    obtenerPerfil: () => apiFetch<Usuario>('/auth/me'),

    listarLaboratorios: () => apiFetch<Laboratorio[]>('/laboratories'),

    listarImportaciones: () => apiFetch<Importacion[]>('/imports'),

    obtenerEstado: (asOf?: string) =>
      apiFetch<EstadoSistema>(`/status${asOf ? `?as_of=${asOf}` : ''}`),

    obtenerConfiguracion: () => apiFetch<Configuracion>('/settings'),

    guardarConfiguracion: (cambios: Partial<Record<string, string | number>>) =>
      apiFetch<Configuracion>('/settings', { method: 'PUT', body: JSON.stringify(cambios) }),

    evaluarAlertas: () => apiFetch<ResumenEvaluacion>('/alerts/evaluate', { method: 'POST' }),

    listarAlertas: (params: { lab?: string; soloVigentes?: boolean } = {}) => {
      const query = new URLSearchParams()
      if (params.lab) query.set('lab', params.lab)
      if (params.soloVigentes) query.set('only_open', 'true')
      const cadena = query.toString()
      return apiFetch<Episodio[]>(`/alerts${cadena ? `?${cadena}` : ''}`)
    },

    obtenerSerie: (code: string, desde?: string, hasta?: string) =>
      apiFetch<RespuestaSeries>(
        `/laboratories/${encodeURIComponent(code)}/readings${rangoQuery(desde, hasta)}`,
      ),

    compararSeries: (codes: string[], desde?: string, hasta?: string) => {
      const query = new URLSearchParams({ labs: codes.join(',') })
      if (desde) query.set('from', desde)
      if (hasta) query.set('to', hasta)
      return apiFetch<RespuestaSeries>(`/readings/compare?${query.toString()}`)
    },

    obtenerProyeccion: (code: string, horizonte: number) =>
      apiFetch<Proyeccion>(
        `/laboratories/${encodeURIComponent(code)}/projection?horizon=${horizonte}`,
      ),

    listarSuscripciones: () => apiFetch<Suscripcion[]>('/subscriptions'),

    suscribirse: (code: string) =>
      apiFetch<Suscripcion>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ laboratory_code: code }),
      }),

    darseDeBaja: (code: string) =>
      apiFetch<void>(`/subscriptions/${encodeURIComponent(code)}`, { method: 'DELETE' }),

    listarAvisos: () => apiFetch<ListaAvisos>('/notifications'),

    marcarAvisoLeido: (id: number) =>
      apiFetch<void>(`/notifications/${id}/read`, { method: 'POST' }),

    marcarTodosLeidos: () => apiFetch<void>('/notifications/read-all', { method: 'POST' }),

    enviarAvisosPendientes: () =>
      apiFetch<ResumenEnvio>('/notifications/send', { method: 'POST' }),
  }
}

export type ClienteOla = ReturnType<typeof crearCliente>
