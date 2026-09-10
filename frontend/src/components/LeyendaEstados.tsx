import type { EstadoTermico } from '../api/client'
import { textos } from '../i18n/textos'

const ESTADOS: EstadoTermico[] = ['warm', 'neutral', 'cold', 'no_data']

export function LeyendaEstados() {
  return (
    <ul className="leyenda" data-testid="leyenda">
      {ESTADOS.map((estado) => (
        <li key={estado}>
          <span className={`punto punto--${estado}`} aria-hidden="true" />
          {textos.estado[estado]}
        </li>
      ))}
    </ul>
  )
}
