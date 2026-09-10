import type { EstadoTermico, EstadoZona } from '../../api/client'

/**
 * Colores del estado termico. Unica fuente de verdad: la usan el mapa, la
 * leyenda y la tabla, para que no puedan desincronizarse.
 *
 * Van siempre acompanados del texto del estado: el color por si solo no basta
 * para quien no distingue rojo y verde.
 */
export const COLORES: Record<EstadoTermico, string> = {
  warm: '#d1495b',
  neutral: '#e0c368',
  cold: '#2a6f97',
  no_data: '#b9c2c9',
}

/** Radio del circulo en pixeles. Las zonas en alerta se dibujan mas grandes
 *  para que destaquen sin depender solo del color. */
export function radioDe(zona: EstadoZona): number {
  return zona.open_alert === null ? 9 : 14
}

export interface Limites {
  suroeste: [number, number]
  noreste: [number, number]
}

/**
 * Encuadre que deja visibles todas las zonas, con un margen para que ninguna
 * quede pegada al borde. Se calcula de las coordenadas y no se fija a mano,
 * asi que se ajusta solo si el catalogo cambia.
 */
export function limitesDe(zonas: EstadoZona[], margen = 1.5): Limites | null {
  if (zonas.length === 0) return null

  const latitudes = zonas.map((z) => Number(z.laboratory.latitude))
  const longitudes = zonas.map((z) => Number(z.laboratory.longitude))

  return {
    suroeste: [Math.min(...latitudes) - margen, Math.min(...longitudes) - margen],
    noreste: [Math.max(...latitudes) + margen, Math.max(...longitudes) + margen],
  }
}
