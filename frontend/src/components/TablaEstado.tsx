import type { EstadoZona } from '../api/client'
import { textos } from '../i18n/textos'
import { PuntoEstado } from './PuntoEstado'

const grados = (valor: string | null): string =>
  valor === null ? '—' : `${Number(valor).toFixed(2)} °C`

export function TablaEstado({ zonas }: { zonas: EstadoZona[] }) {
  return (
    <div className="tabla-desplazable">
      <table data-testid="tabla-estado">
        <thead>
          <tr>
            <th>{textos.estado.zona}</th>
            <th>{textos.estado.situacion}</th>
            <th>{textos.estado.promedio}</th>
            <th>{textos.estado.ultimaMedicion}</th>
            <th>{textos.estado.alerta}</th>
          </tr>
        </thead>
        <tbody>
          {zonas.map((zona) => (
            <tr key={zona.laboratory.code} data-testid={`zona-${zona.laboratory.code}`}>
              <td>{zona.laboratory.name}</td>
              <td>
                <PuntoEstado estado={zona.state} />
                <span data-testid={`situacion-${zona.laboratory.code}`}>
                  {textos.estado[zona.state]}
                </span>
              </td>
              <td>{grados(zona.average_c)}</td>
              <td>
                {zona.last_measured_on ?? '—'}
                {zona.days_since_last !== null && zona.days_since_last > 0 && (
                  <span className="tenue"> ({textos.estado.diasSinDato(zona.days_since_last)})</span>
                )}
              </td>
              <td>
                {zona.open_alert === null ? (
                  <span className="tenue">{textos.estado.sinAlerta}</span>
                ) : (
                  <span data-testid={`alerta-${zona.laboratory.code}`}>
                    {textos.estado[zona.open_alert.state]} {textos.estado.desde}{' '}
                    {zona.open_alert.started_on} ({zona.open_alert.streak_length}{' '}
                    {textos.estado.registros})
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
