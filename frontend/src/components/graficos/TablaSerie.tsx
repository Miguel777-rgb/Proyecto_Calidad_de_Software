import type { SerieLaboratorio } from '../../api/client'
import { textos } from '../../i18n/textos'

/** Vista de tabla del grafico. Es la alternativa accesible: un SVG con lineas
 *  no es utilizable con lector de pantalla. Muestra solo los periodos con
 *  dato, para no llenarla de filas vacias. */
export function TablaSerie({ series }: { series: SerieLaboratorio[] }) {
  if (series.length === 0) return null

  const periodos = series[0].points
    .map((p, i) => ({ period: p.period, indice: i }))
    .filter(({ indice }) => series.some((s) => s.points[indice]?.anomaly_c !== null))

  return (
    <div className="tabla-desplazable">
      <table data-testid="tabla-serie">
        <thead>
          <tr>
            <th>{textos.graficos.periodo}</th>
            {series.map((s) => (
              <th key={s.laboratory.code}>{s.laboratory.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodos.map(({ period, indice }) => (
            <tr key={period}>
              <td>{period}</td>
              {series.map((s) => {
                const valor = s.points[indice]?.anomaly_c
                return (
                  <td key={s.laboratory.code}>
                    {valor === null || valor === undefined
                      ? textos.graficos.sinDato
                      : `${Number(valor).toFixed(2)} °C`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
