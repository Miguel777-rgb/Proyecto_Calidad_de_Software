import { createContext } from 'react'

export interface AvisosSinLeer {
  /** Avisos del usuario que aun no ha leido. 0 sin sesion. */
  sinLeer: number
  /** Vuelve a pedir el contador, p. ej. tras marcar avisos como leidos. */
  refrescar: () => void
}

/**
 * Contador de avisos sin leer que muestra el marco.
 *
 * El valor por defecto permite montar una pagina sin el proveedor (como hacen
 * sus pruebas unitarias): el contador vale 0 y refrescar no hace nada.
 */
export const AvisosContext = createContext<AvisosSinLeer>({
  sinLeer: 0,
  refrescar: () => {},
})
