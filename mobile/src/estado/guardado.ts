import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Configuracion, EstadoSistema } from '@ola/compartido/api'

/** Con la version en la clave, un cambio de formato no lee datos viejos. */
export const CLAVE_ESTADO = 'ola:estado-mar:v1'

export interface EstadoGuardado {
  estado: EstadoSistema
  configuracion: Configuracion | null
  /** Momento en que se guardo, en milisegundos desde 1970. */
  guardadoEn: number
}

/**
 * Guarda lo ultimo que llego de la API para mostrarlo sin conexion. Es un
 * extra: si el almacenamiento falla, la app sigue con los datos en memoria.
 */
export async function guardarEstado(datos: EstadoGuardado): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_ESTADO, JSON.stringify(datos))
  } catch {
    // Sin espacio o sin permiso: la proxima vez se abrira sin datos guardados.
  }
}

function esEstadoGuardado(datos: unknown): datos is EstadoGuardado {
  if (typeof datos !== 'object' || datos === null) return false
  const { estado, guardadoEn } = datos as Partial<EstadoGuardado>
  return (
    typeof guardadoEn === 'number' &&
    typeof estado === 'object' &&
    estado !== null &&
    Array.isArray(estado.zones) &&
    (estado.reference_date === null || typeof estado.reference_date === 'string')
  )
}

/** Lo guardado, o null si no hay nada o no se puede leer. */
export async function leerEstadoGuardado(): Promise<EstadoGuardado | null> {
  try {
    const texto = await AsyncStorage.getItem(CLAVE_ESTADO)
    if (texto === null) return null
    const datos: unknown = JSON.parse(texto)
    return esEstadoGuardado(datos) ? datos : null
  } catch {
    return null
  }
}
