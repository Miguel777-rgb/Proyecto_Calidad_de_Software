import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import type { EstadoSistema, EstadoZona, Sesion, Usuario } from './api/client'

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
