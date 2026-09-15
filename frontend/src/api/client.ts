import { crearCliente } from '@ola/compartido/api'

export * from '@ola/compartido/api'

const TOKEN_KEY = 'ola.token'

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

// El cliente vive en @ola/compartido, que tambien usa la app movil. Aqui solo
// se decide lo propio del navegador: la direccion de la API y localStorage.
export const {
  apiFetch,
  importarCsv,
  getHealth,
  registrar,
  iniciarSesion,
  obtenerPerfil,
  listarLaboratorios,
  listarImportaciones,
  obtenerEstado,
  obtenerConfiguracion,
  guardarConfiguracion,
  evaluarAlertas,
  listarAlertas,
  obtenerSerie,
  compararSeries,
  obtenerProyeccion,
  listarSuscripciones,
  suscribirse,
  darseDeBaja,
  listarAvisos,
  marcarAvisoLeido,
  marcarTodosLeidos,
  enviarAvisosPendientes,
} = crearCliente({
  baseUrl: import.meta.env.VITE_API_URL ?? '/api',
  almacenToken: tokenStorage,
})
