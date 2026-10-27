import { crearCliente, type AlmacenToken, type Usuario } from '@ola/compartido/api'
import * as SecureStore from 'expo-secure-store'
import { configuracion } from './config'

const CLAVE_TOKEN = 'ola.token'
const CLAVE_USUARIO = 'ola.usuario'

/**
 * El token de sesion vive en el almacenamiento cifrado de Android (SRS 3.5).
 * Leerlo cuesta unos milisegundos, asi que se guarda tambien en memoria: solo
 * la primera peticion espera al almacenamiento.
 */
let tokenEnMemoria: string | null | undefined

export const almacenToken: AlmacenToken = {
  get: async () => {
    if (tokenEnMemoria === undefined) tokenEnMemoria = await SecureStore.getItemAsync(CLAVE_TOKEN)
    return tokenEnMemoria
  },
  set: async (token) => {
    tokenEnMemoria = token
    await SecureStore.setItemAsync(CLAVE_TOKEN, token)
  },
  clear: async () => {
    tokenEnMemoria = null
    await SecureStore.deleteItemAsync(CLAVE_TOKEN)
  },
}

/**
 * El usuario de la sesion, tambien cifrado: su correo es un dato personal.
 * Permite abrir la app sin conexion con la sesion y el menu de cuenta.
 */
export const almacenUsuario = {
  get: async (): Promise<Usuario | null> => {
    try {
      const texto = await SecureStore.getItemAsync(CLAVE_USUARIO)
      return texto === null ? null : (JSON.parse(texto) as Usuario)
    } catch {
      return null
    }
  },
  set: (usuario: Usuario) => SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(usuario)),
  clear: () => SecureStore.deleteItemAsync(CLAVE_USUARIO),
}

/** Solo para pruebas: olvida el token leido, como al cerrar y abrir la app. */
export function olvidarTokenEnMemoria(): void {
  tokenEnMemoria = undefined
}

let alPerderSesion: (() => void) | null = null

/**
 * Quien escucha cuando la API rechaza el token a mitad de uso (401). Lo
 * registra el proveedor de sesion; devuelve la funcion para dejar de escuchar.
 */
export function escucharSesionPerdida(oyente: () => void): () => void {
  alPerderSesion = oyente
  return () => {
    if (alPerderSesion === oyente) alPerderSesion = null
  }
}

export const api = crearCliente({
  baseUrl: configuracion().apiUrl,
  almacenToken,
  alNoAutorizado: () => alPerderSesion?.(),
})
