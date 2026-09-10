import type { Proyeccion } from '../../api/client'

export interface FilaProyeccion {
  fecha: string
  medido: number | null
  tendencia: number | null
  nivel: number | null
}

/**
 * Combina el historico reciente con las dos estimaciones en una sola tabla.
 *
 * El ultimo valor MEDIDO se repite como primer punto de ambas estimaciones:
 * sin eso las lineas punteadas empezarian flotando en el aire, desconectadas
 * de la serie de la que salen.
 */
export function aFilasDeProyeccion(proyeccion: Proyeccion): FilaProyeccion[] {
  const historico: FilaProyeccion[] = proyeccion.history.map((p) => ({
    fecha: p.measured_on,
    medido: Number(p.anomaly_c),
    tendencia: null,
    nivel: null,
  }))

  if (proyeccion.linear === null || proyeccion.weighted === null) return historico

  const ultimo = historico.at(-1)
  if (ultimo !== undefined) {
    ultimo.tendencia = ultimo.medido
    ultimo.nivel = ultimo.medido
  }

  const estimado: FilaProyeccion[] = proyeccion.linear.points.map((punto, i) => ({
    fecha: punto.projected_on,
    medido: null,
    tendencia: Number(punto.anomaly_c),
    nivel: Number(proyeccion.weighted!.points[i].anomaly_c),
  }))

  return [...historico, ...estimado]
}

/** Primera fecha estimada, para sombrear el tramo proyectado. */
export function inicioDelTramoEstimado(proyeccion: Proyeccion): string | null {
  return proyeccion.history.at(-1)?.measured_on ?? null
}
