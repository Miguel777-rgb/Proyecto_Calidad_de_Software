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
