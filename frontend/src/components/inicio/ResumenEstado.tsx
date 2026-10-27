import { CircleCheck, Clock, TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import type { EstadoZona } from '../../api/client'
import { textos } from '@ola/compartido/i18n/textos'
import { TINTES } from '@ola/compartido/mapa/paleta'
import { SimboloEstado } from './Estado'
import { ESTADOS, conteoPorEstado, diasDesde, fechaCorta, unirNombres } from '@ola/compartido/inicio/datos'

interface Props {
  /** Fecha del dato mas reciente del sistema (AAAA-MM-DD). */
  referencia: string
  zonas: EstadoZona[]
  hoy: Date
  /** Dias a partir de los cuales el dato se considera atrasado. */
  vigenciaDias: number
}

const BLOQUE = 'grid content-start gap-1.5 px-4 py-3.5 lg:px-5 lg:py-[18px]'
const SEPARADO = 'border-t border-borde lg:border-t-0 lg:border-l'
const ETIQUETA = 'm-0 text-[11.5px] font-semibold tracking-[0.06em] text-tinta-tenue uppercase'

/**
 * Lo primero que ve el pescador: de cuando es el dato, que zonas estan en
 * alerta y cuantas hay en cada estado. El conteo hace ademas de leyenda.
 *
 * La fecha y su antiguedad siempre estan visibles: la SRS exige mostrar la
 * fecha del dato y avisar cuando no corresponde al dia (Confiabilidad).
 */
export function ResumenEstado({ referencia, zonas, hoy, vigenciaDias }: Props) {
  const idConteo = useId()
  const dias = diasDesde(referencia, hoy)
  const atrasado = dias > vigenciaDias
  const enAlerta = zonas.flatMap((z) => (z.open_alert === null ? [] : [{ zona: z, alerta: z.open_alert }]))
  const conteo = conteoPorEstado(zonas)

  return (
    <section
      aria-label={textos.estado.resumen}
      className="grid rounded-2xl border border-borde bg-blanco lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,1.5fr)]"
    >
      <div className={BLOQUE} data-testid="fecha-referencia">
        <p className={ETIQUETA}>{textos.estado.ultimoDatoImarpe}</p>
        <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <strong className="font-datos text-[22px] leading-tight font-semibold tabular-nums">
            {fechaCorta(referencia)}
          </strong>{' '}
          <span
            data-testid="antiguedad-dato"
            data-atrasado={atrasado}
            className={`inline-flex items-center gap-1 rounded-full border py-0.5 pr-2.5 pl-1.5 text-[13px] font-semibold ${
              atrasado ? 'border-atencion-borde bg-atencion-fondo' : 'border-borde bg-marea-fondo'
            }`}
          >
            <Clock aria-hidden="true" className="size-[15px]" />
            {textos.estado.antiguedad(dias)}
          </span>
        </p>
      </div>

      <div className={`${BLOQUE} ${SEPARADO}`}>
        <p className={ETIQUETA}>{textos.estado.etiquetaAlertas}</p>
        {enAlerta.length === 0 ? (
          <p
            data-testid="resumen-alertas"
            className="m-0 flex items-start gap-2.5 font-medium text-tinta-tenue"
          >
            <CircleCheck aria-hidden="true" className="mt-px size-5 shrink-0 text-marea" />
            {textos.estado.ningunaAlerta}
          </p>
        ) : (
          <p
            data-testid="resumen-alertas"
            className="m-0 flex items-start gap-2.5 leading-snug font-semibold"
          >
            <TriangleAlert aria-hidden="true" className="mt-px size-5 shrink-0 text-alerta" />
            {textos.estado.zonasEnAlerta(
              enAlerta.length,
              unirNombres(
                enAlerta.map(
                  ({ zona, alerta }) =>
                    `${zona.laboratory.name} (${textos.estado.singular[alerta.state]})`,
                ),
              ),
            )}
          </p>
        )}
      </div>

      <div className={`${BLOQUE} ${SEPARADO}`}>
        <p className={ETIQUETA} id={idConteo}>
          {textos.estado.etiquetaConteo}
        </p>
        {/* Se muestran tambien los estados sin zonas: la referencia de color y
            simbolo no debe desaparecer segun el dia. */}
        <ul
          data-testid="leyenda"
          aria-labelledby={idConteo}
          className="m-0 flex list-none flex-wrap gap-2 p-0"
        >
          {ESTADOS.map((estado) => (
            <li
              key={estado}
              data-testid={`conteo-${estado}`}
              className="inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-[14.5px] font-medium whitespace-nowrap"
              style={{ background: TINTES[estado] }}
            >
              <SimboloEstado estado={estado} />
              <strong className="font-datos font-semibold tabular-nums">{conteo[estado]}</strong>{' '}
              {conteo[estado] === 1 ? textos.estado.singular[estado] : textos.estado.plural[estado]}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
