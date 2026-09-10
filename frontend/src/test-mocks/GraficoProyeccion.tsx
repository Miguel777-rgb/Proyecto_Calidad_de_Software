/**
 * Doble del grafico de proyeccion. Recharts no puede dibujarse en jsdom;
 * el grafico real se valida en las E2E.
 */
import type { Proyeccion } from '../api/client'

export function GraficoProyeccion({ proyeccion }: { proyeccion: Proyeccion }) {
  return (
    <div
      data-testid="grafico-proyeccion"
      data-zona={proyeccion.laboratory.code}
      data-puntos-estimados={proyeccion.linear?.points.length ?? 0}
    />
  )
}
