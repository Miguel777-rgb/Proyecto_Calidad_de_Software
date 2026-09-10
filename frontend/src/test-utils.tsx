import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import type {
  EstadoSistema,
  EstadoZona,
  Laboratorio,
  Proyeccion,
  RespuestaSeries,
  Sesion,
  Usuario,
} from './api/client'

export const USUARIO: Usuario = {
  id: 2,
  email: 'pescador@ejemplo.pe',
  full_name: 'Juan Pescador',
  role: 'user',
  is_active: true,
  created_at: '2026-09-10T00:00:00Z',
}

export const ADMIN: Usuario = { ...USUARIO, id: 1, email: 'admin@ola.pe', role: 'admin' }

export const sesionDe = (user: Usuario): Sesion => ({
  access_token: 'token-de-prueba',
  token_type: 'bearer',
  expires_in: 3600,
  user,
})

/** Respuesta simulada de fetch. */
/** Estado del sistema sin mediciones cargadas. */
export const ESTADO_VACIO = { reference_date: null, zones: [] }

const zona = (
  code: string,
  name: string,
  state: EstadoZona['state'],
  extra: Partial<EstadoZona> = {},
): EstadoZona => ({
  laboratory: {
    id: 1,
    code,
    name,
    latitude: '-12.05',
    longitude: '-77.14',
    is_active: true,
  },
  state,
  average_c: '1.2000',
  last_anomaly_c: '1.5000',
  last_measured_on: '2026-07-31',
  days_since_last: 0,
  is_stale: false,
  open_alert: null,
  ...extra,
})

/** Estado con los casos que interesan: alerta vigente, zona caliente sin
 *  racha suficiente, zona neutra y zona sin datos recientes. */
export const ESTADO_MUESTRA: EstadoSistema = {
  reference_date: '2026-07-31',
  zones: [
    zona('CALLAO', 'Callao', 'warm', {
      open_alert: {
        id: 1,
        state: 'warm',
        started_on: '2026-07-26',
        streak_length: 6,
        peak_anomaly_c: '1.6000',
      },
    }),
    zona('HUACHO', 'Huacho', 'warm'),
    zona('PISCO', 'Pisco', 'cold', { average_c: '-1.2000' }),
    zona('TUMBES', 'Tumbes', 'neutral', { average_c: '0.1000' }),
    zona('MATARANI', 'Matarani', 'no_data', {
      average_c: null,
      last_measured_on: '2016-12-31',
      days_since_last: 3499,
      is_stale: true,
    }),
  ],
}

export function respuesta(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

export function renderConProveedores(
  ui: ReactElement,
  { ruta = '/', ...options }: RenderOptions & { ruta?: string } = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}

const CODIGOS: [string, string][] = [
  ['TUMBES', 'Tumbes'],
  ['PAITA', 'Paita'],
  ['SAN JOSE', 'San José'],
  ['CHICAMA', 'Chicama'],
  ['CHIMBOTE', 'Chimbote'],
  ['HUACHO', 'Huacho'],
  ['CALLAO', 'Callao'],
  ['PISCO', 'Pisco'],
  ['MATARANI', 'Matarani'],
  ['ILO', 'Ilo'],
]

/** Las 10 zonas del catalogo, como las devuelve GET /laboratories. */
export const LABORATORIOS: Laboratorio[] = CODIGOS.map(([code, name], i) => ({
  id: i + 1,
  code,
  name,
  latitude: String(-3 - i * 1.5),
  longitude: '-77.0',
  is_active: true,
}))

/** Respuesta de series para una o varias zonas, con el mismo eje temporal. */
export function seriesDe(
  codigos: string | string[],
  valores: (string | null)[],
  resolution: RespuestaSeries['resolution'] = 'daily',
): RespuestaSeries {
  const lista = Array.isArray(codigos) ? codigos : [codigos]
  return {
    since: '2026-05-03',
    until: '2026-07-31',
    resolution,
    series: lista.map((code) => ({
      laboratory: LABORATORIOS.find((l) => l.code === code)!,
      points: valores.map((v, i) => ({
        period: `2026-07-${String(i + 1).padStart(2, '0')}`,
        anomaly_c: v,
        samples: v === null ? 0 : 1,
      })),
    })),
  }
}

/** Proyeccion de ejemplo: cuatro dias medidos y tres estimados. */
export function proyeccionDe(cambios: Partial<Proyeccion> = {}): Proyeccion {
  return {
    laboratory: LABORATORIOS[0],
    reference_date: '2026-07-31',
    last_measured_on: '2026-07-31',
    days_behind: 0,
    horizon_days: 3,
    window: 30,
    confidence: 'high',
    history: [
      { measured_on: '2026-07-28', anomaly_c: '1.0000' },
      { measured_on: '2026-07-29', anomaly_c: '1.2000' },
      { measured_on: '2026-07-30', anomaly_c: '1.4000' },
      { measured_on: '2026-07-31', anomaly_c: '1.6000' },
    ],
    linear: {
      method: 'linear_regression',
      points: [
        { projected_on: '2026-08-01', anomaly_c: '1.8000' },
        { projected_on: '2026-08-02', anomaly_c: '2.0000' },
        { projected_on: '2026-08-03', anomaly_c: '2.2000' },
      ],
      final_value: '2.2000',
      final_state: 'warm',
    },
    weighted: {
      method: 'weighted_moving_average',
      points: [
        { projected_on: '2026-08-01', anomaly_c: '1.3000' },
        { projected_on: '2026-08-02', anomaly_c: '1.3000' },
        { projected_on: '2026-08-03', anomaly_c: '1.3000' },
      ],
      final_value: '1.3000',
      final_state: 'warm',
    },
    agreement_c: '0.9000',
    unavailable_reason: null,
    ...cambios,
  }
}
