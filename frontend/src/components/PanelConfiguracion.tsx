import { useEffect, useState, type FormEvent } from 'react'
import {
  ApiError,
  evaluarAlertas,
  guardarConfiguracion,
  obtenerConfiguracion,
  type Configuracion,
  type ResumenEvaluacion,
} from '../api/client'
import { textos } from '../i18n/textos'

const ENTEROS = [
  'min_streak_records',
  'max_gap_days',
  'freshness_days',
  'map_window_days',
] as const

export function PanelConfiguracion() {
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [evaluando, setEvaluando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    obtenerConfiguracion().then(setConfig).catch(() => setConfig(null))
  }, [])

  if (config === null) return <p role="status">{textos.comun.cargando}</p>

  function editar(campo: keyof Configuracion, valor: string) {
    setConfig((previo) => (previo === null ? previo : { ...previo, [campo]: valor }))
  }

  async function alGuardar(evento: FormEvent) {
    evento.preventDefault()
    if (config === null) return
    setError(null)
    setAviso(null)
    setGuardando(true)
    try {
      const guardado = await guardarConfiguracion({
        threshold_c: config.threshold_c,
        ...Object.fromEntries(ENTEROS.map((c) => [c, Number(config[c])])),
      })
      setConfig(guardado)
      setAviso(textos.configuracion.guardado)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setGuardando(false)
    }
  }

  async function alReevaluar() {
    setError(null)
    setAviso(null)
    setEvaluando(true)
    try {
      const resumen: ResumenEvaluacion = await evaluarAlertas()
      setAviso(textos.configuracion.resultadoEvaluacion(resumen))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setEvaluando(false)
    }
  }

  return (
    <div className="tarjeta">
      <h3>{textos.configuracion.titulo}</h3>
      <p className="tenue">{textos.configuracion.ayuda}</p>

      {/* noValidate: los mensajes de validacion del navegador dependen de
          su idioma. Se deja validar al servidor, que responde en espanol. */}
      <form onSubmit={alGuardar} noValidate>
        <label htmlFor="threshold_c">{textos.configuracion.threshold_c}</label>
        <input
          id="threshold_c"
          type="number"
          step="0.1"
          min="0.1"
          max="5"
          value={config.threshold_c}
          onChange={(e) => editar('threshold_c', e.target.value)}
        />

        {ENTEROS.map((campo) => (
          <div key={campo} className="campo">
            <label htmlFor={campo}>{textos.configuracion[campo]}</label>
            <input
              id={campo}
              type="number"
              step="1"
              value={config[campo]}
              onChange={(e) => editar(campo, e.target.value)}
            />
          </div>
        ))}

        {error !== null && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {aviso !== null && (
          <p className="aviso" role="status" data-testid="aviso-configuracion">
            {aviso}
          </p>
        )}

        <button type="submit" disabled={guardando}>
          {guardando ? textos.configuracion.guardando : textos.configuracion.guardar}
        </button>
      </form>

      <button type="button" className="secundario" onClick={alReevaluar} disabled={evaluando}>
        {evaluando ? textos.configuracion.reevaluando : textos.configuracion.reevaluar}
      </button>
    </div>
  )
}
