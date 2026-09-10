import type { SerieLaboratorio } from '../../api/client'
import { MarcadorSerie } from './MarcadorSerie'
import { estiloDe } from './paletaSeries'

/** Leyenda del grafico. Con dos o mas series es obligatoria: la identidad de
 *  cada linea nunca puede depender solo del color. */
export function LeyendaSeries({ series }: { series: SerieLaboratorio[] }) {
  if (series.length < 2) return null

  return (
    <ul className="leyenda" data-testid="leyenda-series">
      {series.map((serie, indice) => {
        const estilo = estiloDe(indice)
        return (
          <li key={serie.laboratory.code}>
            <MarcadorSerie forma={estilo.forma} color={estilo.color} />
            {serie.laboratory.name}
          </li>
        )
      })}
    </ul>
  )
}
