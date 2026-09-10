const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    throw new ApiError(`Error ${response.status} al llamar a ${path}`, response.status)
  }
  return (await response.json()) as T
}

export interface HealthResponse {
  status: string
  database?: string
}

export const getHealth = () => apiFetch<HealthResponse>('/health/ready')
