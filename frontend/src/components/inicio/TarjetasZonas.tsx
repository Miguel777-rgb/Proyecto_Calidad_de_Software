import { TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import type { EstadoZona } from '../../api/client'
import { textos } from '../../i18n/textos'
import { TINTES } from '../mapa/paleta'
import { InsigniaEstado } from './Estado'
import { fechaCorta, gradosConSigno } from './datos'

function lineaDelDato(zona: EstadoZona): string | null {
  if (zona.last_measured_on === null) return null
  const fecha = fechaCorta(zona.last_measured_on)
  return zona.is_stale ? textos.estado.sinMedicionesDesde(fecha) : textos.estado.ultimoDato(fecha)
}

interface PropsTarjeta {
  zona: EstadoZona
  seleccionada: boolean
  alSeleccionar: (code: string) => void
}

export function TarjetaZona({ zona, seleccionada, alSeleccionar }: PropsTarjeta) {
  const code = zona.laboratory.code
  const alerta = zona.open_alert
  const dato = lineaDelDato(zona)

  return (
    <button
      type="button"
      aria-pressed={seleccionada}
      data-testid={`tarjeta-${code}`}
      onClick={() => alSeleccionar(code)}
      className="grid w-full cursor-pointer gap-1.5 rounded-[14px] border border-borde bg-blanco py-3.5 pr-3.5 pl-4 text-left font-cuerpo text-[17px] text-abisal hover:border-espuma-tenue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marea aria-pressed:border-marea aria-pressed:shadow-[0_0_0_2px_var(--color-marea)] md:text-base"
    >
      <span className="flex items-center justify-between gap-2.5">
        <span className="font-titulo text-[19px] leading-tight font-semibold">
          {zona.laboratory.name}
        </span>
        <InsigniaEstado estado={zona.state} />
      </span>

      {zona.average_c !== null && (
        <span className="text-[15.5px]">
          <strong className="mr-1.5 font-datos text-lg font-semibold tabular-nums">
            {gradosConSigno(zona.average_c)}
          </strong>{' '}
          {textos.estado.respectoNormal[zona.state]}
        </span>
      )}

      {dato !== null && <span className="text-sm text-tinta-tenue">{dato}</span>}

      {alerta !== null && (
        <span
          data-testid={`tarjeta-alerta-${code}`}
          className="mt-1 flex items-start gap-2 rounded-[10px] px-2.5 py-2 text-[14.5px] leading-snug font-semibold"
          style={{ background: TINTES[alerta.state] }}
        >
          <TriangleAlert aria-hidden="true" className="mt-px size-[18px] shrink-0" />
          {textos.estado.enAlertaDesde(fechaCorta(alerta.started_on), alerta.streak_length)}
        </span>
      )}
    </button>
  )
}

interface Props {
  /** Ya ordenadas: alertas primero y luego de norte a sur. */
  zonas: EstadoZona[]
  seleccionada: string | null
  alSeleccionar: (code: string) => void
}

/** Vista de celular y tablet: una tarjeta por zona, dos columnas desde 768 px. */
export function TarjetasZonas({ zonas, seleccionada, alSeleccionar }: Props) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} className="grid gap-2.5">
      <h3 id={idTitulo} className="m-0 font-titulo text-xl font-semibold">
        {textos.estado.todasLasZonas}
      </h3>
      <ul data-testid="tarjetas-zonas" className="m-0 grid list-none gap-2.5 p-0 md:grid-cols-2">
        {zonas.map((zona) => (
          <li key={zona.laboratory.code}>
            <TarjetaZona
              zona={zona}
              seleccionada={zona.laboratory.code === seleccionada}
              alSeleccionar={alSeleccionar}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
