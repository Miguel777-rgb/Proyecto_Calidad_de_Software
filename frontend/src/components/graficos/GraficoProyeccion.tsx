import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Proyeccion } from '../../api/client'
import { textos } from '../../i18n/textos'
import { dominioVertical, etiquetaPeriodo, marcasVerticales } from './datos'
import { aFilasDeProyeccion, inicioDelTramoEstimado } from './datosProyeccion'

const COLOR_MEDIDO = '#12232e'
const COLOR_TENDENCIA = '#D55E00'
const COLOR_NIVEL = '#3D9BD1'
const UMBRAL = 0.5

export function GraficoProyeccion({ proyeccion }: { proyeccion: Proyeccion }) {
  const filas = aFilasDeProyeccion(proyeccion)
  const inicioEstimado = inicioDelTramoEstimado(proyeccion)
  const dominio = dominioVertical(
    filas.map((f) => ({ period: f.fecha, medido: f.medido, t: f.tendencia, n: f.nivel })),
    ['medido', 't', 'n'],
  )

  return (
    <div className="grafico" data-testid="grafico-proyeccion">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filas} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#e6ebee" vertical={false} />

          {/* El fondo sombreado separa lo medido de lo estimado. Es una de las
              tres senales que exige la SRS para no confundirlos. */}
          {inicioEstimado !== null && (
            <ReferenceArea
              x1={inicioEstimado}
              x2={filas.at(-1)?.fecha}
              fill="#12232e"
              fillOpacity={0.06}
              label={{
                value: textos.proyeccion.tramoProyectado,
                position: 'insideTop',
                fill: '#4a5a66',
                fontSize: 11,
              }}
            />
          )}

          <XAxis
            dataKey="fecha"
            tickFormatter={(f: string) => etiquetaPeriodo(f, 'daily')}
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

          <ReferenceLine y={0} stroke="#9aa8b2" />
          <ReferenceLine y={UMBRAL} stroke="#c9d3da" strokeDasharray="4 4" />
          <ReferenceLine y={-UMBRAL} stroke="#c9d3da" strokeDasharray="4 4" />

          <Tooltip content={<GloboProyeccion />} cursor={{ stroke: '#9aa8b2' }} />

          <Line
            type="linear"
            dataKey="medido"
            name={textos.proyeccion.medido}
            stroke={COLOR_MEDIDO}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          {/* Las estimaciones van punteadas: segunda senal de que no son
              mediciones. */}
          <Line
            type="linear"
            dataKey="tendencia"
            name={textos.proyeccion.metodos.linear_regression}
            stroke={COLOR_TENDENCIA}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: COLOR_TENDENCIA, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="nivel"
            name={textos.proyeccion.metodos.weighted_moving_average}
            stroke={COLOR_NIVEL}
            strokeWidth={2}
            strokeDasharray="2 4"
            dot={{ r: 3, fill: COLOR_NIVEL, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface GloboProps {
  active?: boolean
  label?: string
  payload?: { name?: string; value?: number | null; color?: string }[]
}

function GloboProyeccion({ active, label, payload }: GloboProps) {
  if (!active || !payload) return null
  const visibles = payload.filter((p) => p.value !== null && p.value !== undefined)
  if (visibles.length === 0) return null

  return (
    <div className="globo-datos">
      <p className="globo-datos__fecha">{label}</p>
      <ul>
        {visibles.map((p) => (
          <li key={p.name}>
            <span className="globo-datos__marca" style={{ background: p.color }} />
            {p.name}: <strong>{p.value!.toFixed(2)} °C</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
