import { crearCliente, type AlmacenToken } from '@ola/compartido/api'
import { configuracion } from './config'

/**
 * Hasta la fase 3 la app no inicia sesion, asi que el token solo vive en
 * memoria. En esa fase pasa al almacenamiento cifrado del sistema (SRS 3.5).
 */
let tokenEnMemoria: string | null = null

export const almacenToken: AlmacenToken = {
  get: () => tokenEnMemoria,
  set: (token) => {
    tokenEnMemoria = token
  },
  clear: () => {
    tokenEnMemoria = null
  },
}

export const api = crearCliente({ baseUrl: configuracion().apiUrl, almacenToken })
