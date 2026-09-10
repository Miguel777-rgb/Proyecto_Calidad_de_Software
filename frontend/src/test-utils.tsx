import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import type { Sesion, Usuario } from './api/client'

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
