import { useState, type FormEvent } from 'react'
import { textos } from '../../i18n/textos'

interface Props {
  desde: string
  hasta: string
  alAplicar: (desde: string, hasta: string) => void
}

export function SelectorRango({ desde, hasta, alAplicar }: Props) {
  const [inicio, setInicio] = useState(desde)
  const [fin, setFin] = useState(hasta)
  const [error, setError] = useState<string | null>(null)

  function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (inicio > fin) {
      setError(textos.graficos.rangoInvertido)
      return
    }
    setError(null)
    alAplicar(inicio, fin)
  }

  return (
    <form className="filtros" onSubmit={alEnviar} noValidate>
      <div>
        <label htmlFor="desde">{textos.graficos.desde}</label>
        <input id="desde" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
      </div>
      <div>
        <label htmlFor="hasta">{textos.graficos.hasta}</label>
        <input id="hasta" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
      </div>
      <button type="submit">{textos.graficos.aplicar}</button>

      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
