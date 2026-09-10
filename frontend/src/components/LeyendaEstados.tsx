import type { EstadoTermico } from '../api/client'
import { textos } from '../i18n/textos'
import { PuntoEstado } from './PuntoEstado'

const ESTADOS: EstadoTermico[] = ['warm', 'neutral', 'cold', 'no_data']

export function LeyendaEstados() {
  return (
    <ul className="leyenda" data-testid="leyenda">
      {ESTADOS.map((estado) => (
        <li key={estado}>
          <PuntoEstado estado={estado} />
          {textos.estado[estado]}
        </li>
      ))}
    </ul>
  )
}
