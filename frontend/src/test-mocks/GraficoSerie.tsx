/**
 * Doble del grafico para las pruebas unitarias.
 *
 * Recharts mide el contenedor real para decidir el tamano del SVG, y en jsdom
 * ese tamano es cero, asi que no llega a dibujar nada. Este doble expone lo
 * que las pruebas de pagina necesitan saber: que series se estan pintando.
 *
 * El grafico de verdad se valida en las E2E, que corren en un navegador, y su
 * logica pura (transformacion de datos, dominio, marcas) se prueba aparte en
 * datos.test.ts.
 */
import type { SerieLaboratorio } from '../api/client'

export function GraficoSerie({
  series,
  resolucion,
}: {
  series: SerieLaboratorio[]
  resolucion: string
}) {
  return (
    <div
      data-testid="grafico-serie"
      data-resolucion={resolucion}
      data-series={series.map((s) => s.laboratory.code).join(',')}
    />
  )
}
