import { useEffect, useState } from 'react'
import {
  listarLaboratorios,
  obtenerProyeccion,
  type Laboratorio,
  type Proyeccion as DatosProyeccion,
} from '../api/client'
import { GraficoProyeccion } from '../components/graficos/GraficoProyeccion'
import { textos } from '../i18n/textos'

const HORIZONTES = [3, 4, 5, 6, 7]
const HORIZONTE_POR_DEFECTO = 5

// Por debajo de esta diferencia se considera que los dos metodos coinciden.
const TOLERANCIA_ACUERDO = 0.2

export default function Proyeccion() {
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([])
  const [zona, setZona] = useState('')
  const [horizonte, setHorizonte] = useState(HORIZONTE_POR_DEFECTO)
  const [datos, setDatos] = useState<DatosProyeccion | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    listarLaboratorios().then((lista) => {
      setLaboratorios(lista)
      setZona((actual) => actual || (lista[0]?.code ?? ''))
    })
  }, [])

  useEffect(() => {
    if (zona === '') return
    // Sin esta guarda, una peticion anterior que llegue tarde sobrescribe el
    // resultado de la actual y la pantalla muestra la zona equivocada.
    let vigente = true
    setCargando(true)
    obtenerProyeccion(zona, horizonte)
      .then((datos) => vigente && setDatos(datos))
      .catch(() => vigente && setDatos(null))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [zona, horizonte])

  const acuerdo = datos?.agreement_c === null ? null : Number(datos?.agreement_c)
  const coinciden = acuerdo !== null && acuerdo !== undefined && acuerdo < TOLERANCIA_ACUERDO

  return (
    <section>
      <h2>{textos.proyeccion.titulo}</h2>

      {/* Tercera senal de que no es un pronostico, junto al trazo punteado y
          al fondo sombreado del grafico. */}
      <p className="aviso aviso--atencion" data-testid="advertencia-estimacion">
        {textos.proyeccion.advertencia}
      </p>

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
        <div>
          <label htmlFor="horizonte">{textos.proyeccion.horizonte}</label>
          <select
            id="horizonte"
            value={horizonte}
            onChange={(e) => setHorizonte(Number(e.target.value))}
          >
            {HORIZONTES.map((h) => (
              <option key={h} value={h}>
                {textos.proyeccion.dias(h)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cargando && <p role="status">{textos.comun.cargando}</p>}

      {!cargando && datos !== null && (
        <>
          <p data-testid="confianza" className={`insignia insignia--${datos.confidence}`}>
            {textos.proyeccion.confianza}:{' '}
            <strong>{textos.proyeccion.confianzas[datos.confidence]}</strong>
            {' — '}
            <span className="tenue">
              {textos.proyeccion.explicacionConfianza[datos.confidence]}
            </span>
          </p>

          {datos.days_behind !== null && datos.days_behind > 0 && (
            <p className="tenue" data-testid="dato-atrasado">
              {textos.proyeccion.datoAtrasado(datos.days_behind)}
            </p>
          )}

          {datos.linear === null || datos.weighted === null ? (
            <p className="aviso aviso--atencion" data-testid="sin-proyeccion">
              {textos.proyeccion.sinProyeccion}
            </p>
          ) : (
            <>
              <ul className="estimaciones" data-testid="estimaciones">
                <li>
                  <span className="estimaciones__metodo">
                    {textos.proyeccion.metodos.linear_regression}
                  </span>
                  <strong data-testid="valor-tendencia">
                    {Number(datos.linear.final_value).toFixed(2)} °C
                  </strong>
                  <span className="tenue">{textos.estado[datos.linear.final_state]}</span>
                </li>
                <li>
                  <span className="estimaciones__metodo">
                    {textos.proyeccion.metodos.weighted_moving_average}
                  </span>
                  <strong data-testid="valor-nivel">
                    {Number(datos.weighted.final_value).toFixed(2)} °C
                  </strong>
                  <span className="tenue">{textos.estado[datos.weighted.final_state]}</span>
                </li>
              </ul>

              <p className="tenue" data-testid="acuerdo">
                {coinciden
                  ? textos.proyeccion.coinciden
                  : textos.proyeccion.difieren(acuerdo!.toFixed(2))}
              </p>

              <GraficoProyeccion proyeccion={datos} />
              <p className="tenue">{textos.proyeccion.explicacionMetodos}</p>
            </>
          )}
        </>
      )}
    </section>
  )
}
