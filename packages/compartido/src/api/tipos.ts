/**
 * Tipos de las respuestas de la API de OLA.
 *
 * Reflejan los esquemas de FastAPI. Los usan la web y la app movil, asi que
 * un cambio en el backend se corrige en un solo lugar.
 */

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
