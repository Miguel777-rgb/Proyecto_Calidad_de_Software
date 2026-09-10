import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SerieLaboratorio } from '../../api/client'
import { textos } from '../../i18n/textos'
import { aFilasDeGrafico, dominioVertical, etiquetaPeriodo, marcasVerticales } from './datos'
import { estiloDe, pasoDeMarcadores, trazadoForma } from './paletaSeries'

// Umbral de clasificacion. Dibujarlo da contexto: sin la referencia, el
// usuario no sabe a partir de que valor la anomalia deja de ser normal.
const UMBRAL = 0.5

interface Props {
  series: SerieLaboratorio[]
  resolucion: string
  umbral?: number
}

interface DotProps {
  cx?: number
  cy?: number
  index?: number
  value?: number | null
}

export function GraficoSerie({ series, resolucion, umbral = UMBRAL }: Props) {
  const filas = aFilasDeGrafico(series)
  const codigos = series.map((s) => s.laboratory.code)
  const paso = pasoDeMarcadores(filas.length)
  const dominio = dominioVertical(filas, codigos)

  return (
    <div className="grafico" data-testid="grafico-serie">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filas} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          {/* Rejilla y ejes recesivos: el dato manda, no el andamiaje. */}
          <CartesianGrid stroke="#e6ebee" vertical={false} />

          <XAxis
            dataKey="period"
            tickFormatter={(p: string) => etiquetaPeriodo(p, resolucion)}
            tick={{ fill: '#4a5a66', fontSize: 12 }}
            stroke="#d8e0e6"
            minTickGap={28}
          />
          <YAxis
            domain={dominio}
            ticks={marcasVerticales(dominio)}
            tick={{ fill: '#4a5a66', fontSize: 12 }}
            stroke="#d8e0e6"
            width={48}
            tickFormatter={(v: number) => `${v} °C`}
          />

          <ReferenceLine y={0} stroke="#9aa8b2" strokeWidth={1} />
          <ReferenceLine y={umbral} stroke="#c9d3da" strokeDasharray="4 4" />
          <ReferenceLine y={-umbral} stroke="#c9d3da" strokeDasharray="4 4" />

          <Tooltip
            content={<GloboDatos resolucion={resolucion} series={series} />}
            cursor={{ stroke: '#9aa8b2', strokeWidth: 1 }}
          />

          {series.map((serie, indice) => {
            const estilo = estiloDe(indice)
            return (
              <Line
                key={serie.laboratory.code}
                type="linear"
                dataKey={serie.laboratory.code}
                name={serie.laboratory.name}
                stroke={estilo.color}
                strokeWidth={2}
                strokeDasharray={estilo.trazo}
                // Sin esto la linea uniria los extremos de un hueco y
                // dibujaria una tendencia que nadie midio.
                connectNulls={false}
                isAnimationActive={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                dot={(props: DotProps) => (
                  <Marcador {...props} estilo={estilo} paso={paso} clave={serie.laboratory.code} />
                )}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Marcador con forma propia, dibujado cada `paso` puntos para no saturar. */
function Marcador({
  cx,
  cy,
  index,
  value,
  estilo,
  paso,
  clave,
}: DotProps & { estilo: ReturnType<typeof estiloDe>; paso: number; clave: string }) {
  if (cx === undefined || cy === undefined || value === null || value === undefined) {
    return <g key={`${clave}-vacio-${index}`} />
  }
  if ((index ?? 0) % paso !== 0) return <g key={`${clave}-omitido-${index}`} />

  return (
    <path
      key={`${clave}-${index}`}
      d={trazadoForma(estilo.forma, cx, cy, 4.5)}
      fill={estilo.color}
      stroke="#ffffff"
      strokeWidth={1.5}
    />
  )
}

interface GloboProps {
  active?: boolean
  label?: string
  payload?: { dataKey?: string | number; value?: number | null }[]
  resolucion: string
  series: SerieLaboratorio[]
}

function GloboDatos({ active, label, payload, series }: GloboProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="globo-datos">
      <p className="globo-datos__fecha">{label}</p>
      <ul>
        {series.map((serie, indice) => {
          const dato = payload.find((p) => p.dataKey === serie.laboratory.code)
          const estilo = estiloDe(indice)
          return (
            <li key={serie.laboratory.code}>
              <span className="globo-datos__marca" style={{ background: estilo.color }} />
              {serie.laboratory.name}:{' '}
              <strong>
                {dato?.value === null || dato?.value === undefined
                  ? textos.graficos.sinDato
                  : `${dato.value.toFixed(2)} °C`}
              </strong>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
