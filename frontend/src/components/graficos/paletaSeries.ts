/**
 * Estilos de las series comparadas (RF-06).
 *
 * Cada serie combina TRES canales redundantes: color, forma del marcador y
 * patron de trazo. Asi se distinguen aunque el usuario no perciba el color,
 * imprima en blanco y negro o mire en una pantalla con mal contraste.
 *
 * La paleta esta validada: con las cuatro series a la vez supera la
 * separacion para daltonismo (peor par ΔE 9.0 en deuteranopia), el minimo de
 * distincion para vision normal (ΔE 16.8) y el contraste de 3:1 contra el
 * fondo blanco del grafico.
 *
 * El orden es FIJO: la primera zona elegida siempre es azul, la segunda
 * naranja, y asi. Quitar una zona no repinta a las demas.
 */

export type FormaMarcador = 'circulo' | 'cuadrado' | 'triangulo' | 'rombo'

export interface EstiloSerie {
  color: string
  forma: FormaMarcador
  trazo: string | undefined
}

export const ESTILOS_SERIE: readonly EstiloSerie[] = [
  { color: '#3D9BD1', forma: 'circulo', trazo: undefined },
  { color: '#D55E00', forma: 'cuadrado', trazo: '7 4' },
  { color: '#00806A', forma: 'triangulo', trazo: '2 4' },
  { color: '#8B4A9C', forma: 'rombo', trazo: '11 4 3 4' },
]

export const MAX_SERIES = ESTILOS_SERIE.length

export function estiloDe(indice: number): EstiloSerie {
  return ESTILOS_SERIE[indice % ESTILOS_SERIE.length]
}

/** Puntos del marcador para una forma, centrada en (cx, cy). */
export function trazadoForma(forma: FormaMarcador, cx: number, cy: number, r: number): string {
  switch (forma) {
    case 'cuadrado':
      return `M${cx - r},${cy - r} h${r * 2} v${r * 2} h${-r * 2} Z`
    case 'triangulo':
      return `M${cx},${cy - r} L${cx + r},${cy + r} L${cx - r},${cy + r} Z`
    case 'rombo':
      return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`
    case 'circulo':
      // Se dibuja como dos arcos para no necesitar un elemento distinto.
      return `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`
  }
}

/** Cada cuantos puntos se dibuja un marcador.
 *
 * Con 90 puntos diarios, marcarlos todos satura el grafico; con muy pocos, la
 * forma deja de servir como distintivo. Se apunta a una docena por serie. */
export function pasoDeMarcadores(totalPuntos: number, objetivo = 12): number {
  return Math.max(1, Math.ceil(totalPuntos / objetivo))
}
