const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'ola.token'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Navegador en modo privado o con almacenamiento bloqueado: la sesion
      // vive solo en memoria y se pierde al recargar.
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Ver comentario en set().
    }
  },
}

/** Mensaje legible a partir del cuerpo de error de FastAPI. */
function extraerMensaje(cuerpo: unknown, respaldo: string): string {
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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStorage.get()
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let cuerpo: unknown = null
    try {
      cuerpo = await response.json()
    } catch {
      // Respuesta sin cuerpo JSON.
    }
    throw new ApiError(
      extraerMensaje(cuerpo, `Error ${response.status} al llamar a ${path}`),
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export interface HealthResponse {
  status: string
  database?: string
}

export type UserRole = 'admin' | 'user'

export interface Usuario {
  id: number
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Sesion {
  access_token: string
  token_type: string
  expires_in: number
  user: Usuario
}

export const getHealth = () => apiFetch<HealthResponse>('/health/ready')

export const registrar = (datos: {
  email: string
  password: string
  full_name?: string
}) => apiFetch<Sesion>('/auth/register', { method: 'POST', body: JSON.stringify(datos) })

export const iniciarSesion = (datos: { email: string; password: string }) =>
  apiFetch<Sesion>('/auth/login', { method: 'POST', body: JSON.stringify(datos) })

export const obtenerPerfil = () => apiFetch<Usuario>('/auth/me')

export interface Laboratorio {
  id: number
  code: string
  name: string
  latitude: string
  longitude: string
  is_active: boolean
}

export type EstadoImportacion = 'running' | 'completed' | 'failed'

export interface ErrorImportacion {
  line: number
  reason: string
  content: string
}

export interface Importacion {
  id: number
  filename: string
  byte_size: number
  sha256: string
  status: EstadoImportacion
  rows_total: number
  rows_inserted: number
  rows_updated: number
  rows_unchanged: number
  rows_rejected: number
  error_sample: ErrorImportacion[] | null
  error_message: string | null
  duration_ms: number | null
  started_at: string
  finished_at: string | null
  uploaded_by_email: string | null
}

export const listarLaboratorios = () => apiFetch<Laboratorio[]>('/laboratories')

export const listarImportaciones = () => apiFetch<Importacion[]>('/imports')

/** Envia el CSV. No fija Content-Type: el navegador debe generar el limite
 *  del formulario multipart por su cuenta. */
export async function importarCsv(archivo: File): Promise<Importacion> {
  const cuerpo = new FormData()
  cuerpo.append('file', archivo)
  const token = tokenStorage.get()

  const respuesta = await fetch(`${BASE_URL}/imports`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: cuerpo,
  })

  let datos: unknown = null
  try {
    datos = await respuesta.json()
  } catch {
    // Respuesta sin cuerpo JSON.
  }
  if (!respuesta.ok) {
    throw new ApiError(
      extraerMensaje(datos, `Error ${respuesta.status} al importar el archivo`),
      respuesta.status,
    )
  }
  return datos as Importacion
}

export type EstadoTermico = 'warm' | 'neutral' | 'cold' | 'no_data'

export interface AlertaVigente {
  id: number
  state: 'warm' | 'cold'
  started_on: string
  streak_length: number
  peak_anomaly_c: string
}

export interface EstadoZona {
  laboratory: Laboratorio
  state: EstadoTermico
  average_c: string | null
  last_anomaly_c: string | null
  last_measured_on: string | null
  days_since_last: number | null
  is_stale: boolean
  open_alert: AlertaVigente | null
}

export interface EstadoSistema {
  /** Fecha del dato mas reciente. La interfaz debe mostrarla siempre: la SRS
   *  exige avisar cuando el dato no corresponde al dia actual. */
  reference_date: string | null
  zones: EstadoZona[]
}

export interface Configuracion {
  threshold_c: string
  min_streak_records: number
  max_gap_days: number
  freshness_days: number
  map_window_days: number
}

export interface ResumenEvaluacion {
  reference_date: string | null
  laboratories_evaluated: number
  events_total: number
  events_open: number
  events_removed: number
}

export interface Episodio {
  id: number
  laboratory_code: string
  laboratory_name: string
  state: 'warm' | 'cold'
  started_on: string
  ended_on: string
  streak_length: number
  peak_anomaly_c: string
  is_open: boolean
}

export const obtenerEstado = (asOf?: string) =>
  apiFetch<EstadoSistema>(`/status${asOf ? `?as_of=${asOf}` : ''}`)

export const obtenerConfiguracion = () => apiFetch<Configuracion>('/settings')

export const guardarConfiguracion = (cambios: Partial<Record<string, string | number>>) =>
  apiFetch<Configuracion>('/settings', { method: 'PUT', body: JSON.stringify(cambios) })

export const evaluarAlertas = () =>
  apiFetch<ResumenEvaluacion>('/alerts/evaluate', { method: 'POST' })

export const listarAlertas = (params: { lab?: string; soloVigentes?: boolean } = {}) => {
  const query = new URLSearchParams()
  if (params.lab) query.set('lab', params.lab)
  if (params.soloVigentes) query.set('only_open', 'true')
  const cadena = query.toString()
  return apiFetch<Episodio[]>(`/alerts${cadena ? `?${cadena}` : ''}`)
}

export type Resolucion = 'daily' | 'weekly' | 'monthly'

export interface PuntoSerie {
  period: string
  /** `null` marca un periodo sin mediciones: el grafico corta la linea ahi. */
  anomaly_c: string | null
  samples: number
}

export interface SerieLaboratorio {
  laboratory: Laboratorio
  points: PuntoSerie[]
}

export interface RespuestaSeries {
  since: string
  until: string
  resolution: Resolucion
  series: SerieLaboratorio[]
}

function rangoQuery(desde?: string, hasta?: string): string {
  const query = new URLSearchParams()
  if (desde) query.set('from', desde)
  if (hasta) query.set('to', hasta)
  const cadena = query.toString()
  return cadena ? `?${cadena}` : ''
}

export const obtenerSerie = (code: string, desde?: string, hasta?: string) =>
  apiFetch<RespuestaSeries>(
    `/laboratories/${encodeURIComponent(code)}/readings${rangoQuery(desde, hasta)}`,
  )

export const compararSeries = (codes: string[], desde?: string, hasta?: string) => {
  const query = new URLSearchParams({ labs: codes.join(',') })
  if (desde) query.set('from', desde)
  if (hasta) query.set('to', hasta)
  return apiFetch<RespuestaSeries>(`/readings/compare?${query.toString()}`)
}

export type MetodoProyeccion = 'linear_regression' | 'weighted_moving_average'
export type Confianza = 'high' | 'medium' | 'low'

export interface PuntoProyectado {
  projected_on: string
  anomaly_c: string
}

export interface ProyeccionMetodo {
  method: MetodoProyeccion
  points: PuntoProyectado[]
  final_value: string
  final_state: EstadoTermico
}

export interface Proyeccion {
  laboratory: Laboratorio
  reference_date: string | null
  last_measured_on: string | null
  days_behind: number | null
  horizon_days: number
  window: number
  confidence: Confianza
  history: { measured_on: string; anomaly_c: string }[]
  linear: ProyeccionMetodo | null
  weighted: ProyeccionMetodo | null
  /** Cuanto difieren las dos estimaciones. Una diferencia grande es en si
   *  una senal de incertidumbre. */
  agreement_c: string | null
  unavailable_reason: string | null
}

export const obtenerProyeccion = (code: string, horizonte: number) =>
  apiFetch<Proyeccion>(
    `/laboratories/${encodeURIComponent(code)}/projection?horizon=${horizonte}`,
  )

export interface Suscripcion {
  id: number
  laboratory: Laboratorio
  created_at: string
}

export type TipoAviso = 'opened' | 'closed'

export interface Aviso {
  id: number
  laboratory_code: string
  laboratory_name: string
  kind: TipoAviso
  alert_state: 'warm' | 'cold'
  started_on: string
  ended_on: string
  streak_length: number
  created_at: string
  read_at: string | null
}

export interface ListaAvisos {
  unread: number
  items: Aviso[]
}

export interface ResumenEnvio {
  attempted: number
  sent: number
  failed: number
  by_status: Record<string, number>
}

export const listarSuscripciones = () => apiFetch<Suscripcion[]>('/subscriptions')

export const suscribirse = (code: string) =>
  apiFetch<Suscripcion>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ laboratory_code: code }),
  })

export const darseDeBaja = (code: string) =>
  apiFetch<void>(`/subscriptions/${encodeURIComponent(code)}`, { method: 'DELETE' })

export const listarAvisos = () => apiFetch<ListaAvisos>('/notifications')

export const marcarAvisoLeido = (id: number) =>
  apiFetch<void>(`/notifications/${id}/read`, { method: 'POST' })

export const marcarTodosLeidos = () =>
  apiFetch<void>('/notifications/read-all', { method: 'POST' })

export const enviarAvisosPendientes = () =>
  apiFetch<ResumenEnvio>('/notifications/send', { method: 'POST' })
