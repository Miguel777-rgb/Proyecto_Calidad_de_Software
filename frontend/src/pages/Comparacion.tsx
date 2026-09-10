import { useEffect, useState } from 'react'
import {
  ApiError,
  compararSeries,
  listarLaboratorios,
  type Laboratorio,
  type RespuestaSeries,
} from '../api/client'
import { GraficoSerie } from '../components/graficos/GraficoSerie'
import { LeyendaSeries } from '../components/graficos/LeyendaSeries'
import { MarcadorSerie } from '../components/graficos/MarcadorSerie'
import { SelectorRango } from '../components/graficos/SelectorRango'
import { TablaSerie } from '../components/graficos/TablaSerie'
import { MAX_SERIES, estiloDe } from '../components/graficos/paletaSeries'
import { textos } from '../i18n/textos'

export default function Comparacion() {
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([])
  const [elegidas, setElegidas] = useState<string[]>([])
  const [datos, setDatos] = useState<RespuestaSeries | null>(null)
  const [rango, setRango] = useState<{ desde?: string; hasta?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    listarLaboratorios().then((lista) => {
      setLaboratorios(lista)
      setElegidas((actual) =>
        actual.length > 0 ? actual : lista.slice(0, 2).map((l) => l.code),
      )
    })
  }, [])

  useEffect(() => {
    if (elegidas.length === 0) {
      setDatos(null)
      return
    }
    // Sin esta guarda, una peticion anterior que llegue tarde sobrescribe el
    // resultado de la actual y el grafico muestra zonas que ya no estan
    // seleccionadas.
    let vigente = true
    setCargando(true)
    setError(null)
    compararSeries(elegidas, rango.desde, rango.hasta)
      .then((datos) => vigente && setDatos(datos))
      .catch((e) => {
        if (!vigente) return
        setDatos(null)
        setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [elegidas, rango])

  function alternar(code: string) {
    setError(null)
    setElegidas((actual) => {
      if (actual.includes(code)) return actual.filter((c) => c !== code)
      if (actual.length >= MAX_SERIES) {
        setError(textos.graficos.limiteZonas(MAX_SERIES))
        return actual
      }
      return [...actual, code]
    })
  }

  return (
    <section>
      <h2>{textos.graficos.comparacion}</h2>
      <p className="tenue">{textos.graficos.elegirZonas(MAX_SERIES)}</p>

      <ul className="selector-zonas" data-testid="selector-zonas">
        {laboratorios.map((lab) => {
          const indice = elegidas.indexOf(lab.code)
          const activa = indice >= 0
          const estilo = activa ? estiloDe(indice) : null
          return (
            <li key={lab.code}>
              <button
                type="button"
                className={`chip ${activa ? 'chip--activa' : ''}`}
                aria-pressed={activa}
                onClick={() => alternar(lab.code)}
              >
                {estilo !== null && <MarcadorSerie forma={estilo.forma} color={estilo.color} />}
                {lab.name}
              </button>
            </li>
          )
        })}
      </ul>

      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {elegidas.length === 0 && (
        <p className="aviso aviso--atencion" data-testid="ninguna-zona">
          {textos.graficos.ningunaZona}
        </p>
      )}

      {datos !== null && (
        <SelectorRango
          desde={datos.since}
          hasta={datos.until}
          alAplicar={(desde, hasta) => setRango({ desde, hasta })}
        />
      )}

      {cargando && <p role="status">{textos.comun.cargando}</p>}

      {!cargando && datos !== null && (
        <>
          <p className="tenue" data-testid="resolucion">
            {textos.graficos.resolucion[datos.resolution]}
          </p>
          <LeyendaSeries series={datos.series} />
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
    </section>
  )
}
