import type { EstadoTermico } from '../api/client'
import { COLORES } from './mapa/paleta'

/** Marca de color del estado termico. Es decorativa: el texto del estado
 *  siempre la acompana, para no depender solo del color. */
export function PuntoEstado({ estado }: { estado: EstadoTermico }) {
  return <span className="punto" style={{ background: COLORES[estado] }} aria-hidden="true" />
}
