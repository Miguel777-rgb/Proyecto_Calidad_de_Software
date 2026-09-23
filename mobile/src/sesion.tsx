import { createContext, useContext, type ReactNode } from 'react'
import type { Usuario } from '@ola/compartido/api'

export interface Sesion {
  usuario: Usuario | null
  /** Avisos sin leer, para el numero del boton de cuenta. */
  sinLeer: number
  salir: () => void
}

const SIN_SESION: Sesion = { usuario: null, sinLeer: 0, salir: () => {} }

const ContextoSesion = createContext<Sesion>(SIN_SESION)

/**
 * La sesion de la app. En la fase 1 no hay inicio de sesion todavia: el marco
 * se construye y se prueba entregandole una sesion simulada. La fase 3 cambia
 * el valor por el de la sesion real, sin tocar a quien lo lee.
 */
export function ProveedorSesion({
  valor = SIN_SESION,
  children,
}: {
  valor?: Sesion
  children: ReactNode
}) {
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

export const useSesion = () => useContext(ContextoSesion)
