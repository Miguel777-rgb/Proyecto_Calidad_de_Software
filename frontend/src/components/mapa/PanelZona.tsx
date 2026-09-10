import type { EstadoZona } from '../../api/client'
import { textos } from '../../i18n/textos'
import { PuntoEstado } from '../PuntoEstado'

const grados = (valor: string | null): string =>
  valor === null ? '—' : `${Number(valor).toFixed(2)} °C`

interface Props {
  zona: EstadoZona | null
  alCerrar: () => void
}

export function PanelZona({ zona, alCerrar }: Props) {
  if (zona === null) {
    return (
      <aside className="panel-zona panel-zona--vacio" data-testid="panel-zona">
        <p className="tenue">{textos.mapa.sinSeleccion}</p>
      </aside>
    )
  }

  const alerta = zona.open_alert

  return (
    <aside className="panel-zona" data-testid="panel-zona" aria-live="polite">
      <div className="panel-zona__cabecera">
        <h3>{zona.laboratory.name}</h3>
        <button
          type="button"
          className="enlace"
          onClick={alCerrar}
          aria-label={textos.mapa.cerrarPanel}
        >
          ✕
        </button>
      </div>

      <p className="panel-zona__situacion" data-testid="panel-situacion">
        <PuntoEstado estado={zona.state} />
        {textos.estado[zona.state]}
      </p>

      <dl className="panel-zona__datos">
        <dt>{textos.estado.promedio}</dt>
        <dd data-testid="panel-promedio">{grados(zona.average_c)}</dd>

        <dt>{textos.mapa.ultimoValor}</dt>
        <dd>{grados(zona.last_anomaly_c)}</dd>

        <dt>{textos.estado.ultimaMedicion}</dt>
        <dd data-testid="panel-ultima-medicion">
          {zona.last_measured_on ?? '—'}
          {zona.days_since_last !== null && zona.days_since_last > 0 && (
            <span className="tenue"> ({textos.estado.diasSinDato(zona.days_since_last)})</span>
          )}
        </dd>
      </dl>

      {zona.is_stale && (
        <p className="aviso aviso--atencion" data-testid="panel-obsoleta">
          {textos.mapa.avisoObsoleta}
        </p>
      )}

      {alerta !== null && (
        <div className="panel-zona__alerta" data-testid="panel-alerta">
          <strong>{textos.mapa.enAlerta(textos.estado[alerta.state])}</strong>
          <p>
            {textos.mapa.detalleAlerta(
              alerta.started_on,
              alerta.streak_length,
              Number(alerta.peak_anomaly_c).toFixed(2),
            )}
          </p>
        </div>
      )}

      {!zona.is_stale && alerta === null && (
        <p className="tenue" data-testid="panel-sin-alerta">
          {textos.mapa.sinAlertaExplicacion}
        </p>
      )}
    </aside>
  )
}
