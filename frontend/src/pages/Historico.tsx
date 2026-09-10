import { useCallback, useEffect, useState } from 'react'
import {
  listarLaboratorios,
  obtenerSerie,
  type Laboratorio,
  type RespuestaSeries,
} from '../api/client'
import { GraficoSerie } from '../components/graficos/GraficoSerie'
import { SelectorRango } from '../components/graficos/SelectorRango'
import { TablaSerie } from '../components/graficos/TablaSerie'
import { textos } from '../i18n/textos'

export default function Historico() {
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([])
  const [zona, setZona] = useState<string>('')
  const [datos, setDatos] = useState<RespuestaSeries | null>(null)
  const [rango, setRango] = useState<{ desde?: string; hasta?: string }>({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    listarLaboratorios().then((lista) => {
      setLaboratorios(lista)
      setZona((actual) => actual || (lista[0]?.code ?? ''))
    })
  }, [])

  const cargar = useCallback(() => {
    if (zona === '') return
    setCargando(true)
    obtenerSerie(zona, rango.desde, rango.hasta)
      .then(setDatos)
      .catch(() => setDatos(null))
      .finally(() => setCargando(false))
  }, [zona, rango])

  useEffect(cargar, [cargar])

  const serie = datos?.series[0]
  const sinMediciones = serie?.points.every((p) => p.anomaly_c === null) ?? false

  return (
    <section>
      <h2>{textos.graficos.historico}</h2>

      <div className="filtros">
        <div>
          <label htmlFor="zona">{textos.graficos.zona}</label>
          <select id="zona" value={zona} onChange={(e) => setZona(e.target.value)}>
            {laboratorios.map((lab) => (
              <option key={lab.code} value={lab.code}>
                {lab.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {datos !== null && (
        <SelectorRango
          desde={datos.since}
          hasta={datos.until}
          alAplicar={(desde, hasta) => setRango({ desde, hasta })}
        />
      )}

      {cargando && <p role="status">{textos.comun.cargando}</p>}

      {!cargando && datos !== null && serie !== undefined && (
        <>
          <p className="tenue" data-testid="resolucion">
            {textos.graficos.resolucion[datos.resolution]} · {textos.graficos.explicacionResolucion}
          </p>

          {sinMediciones ? (
            <p className="aviso aviso--atencion" data-testid="sin-datos-rango">
              {textos.graficos.sinDatosEnRango}
            </p>
          ) : (
            <>
              <GraficoSerie series={datos.series} resolucion={datos.resolution} />
              <p className="tenue">
                {textos.graficos.explicacionUmbral} {textos.graficos.explicacionHuecos}
              </p>

              <details>
                <summary>{textos.graficos.verTabla}</summary>
                <TablaSerie series={datos.series} />
              </details>
            </>
          )}
        </>
      )}
    </section>
  )
}
