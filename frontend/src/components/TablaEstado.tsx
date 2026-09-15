import type { EstadoZona } from '../api/client'
import { textos } from '@ola/compartido/i18n/textos'
import { InsigniaEstado } from './inicio/Estado'
import { fechaCorta, gradosConSigno } from '@ola/compartido/inicio/datos'

interface Props {
  /** Ya ordenadas: alertas primero y luego de norte a sur. */
  zonas: EstadoZona[]
  /** Dias que promedia el mapa; null si la configuracion no llego. */
  ventana: number | null
  seleccionada: string | null
  alSeleccionar: (code: string) => void
}

const BASE = 'border-b border-borde px-3.5 py-2.5 text-left align-middle'
const CELDA = `${BASE} whitespace-nowrap`
// La alerta es el texto mas largo: puede bajar de linea para que la tabla
// quepa en el ancho del contenido sin desplazamiento horizontal. La utilidad
// es explicita porque estilos.css fija `white-space: nowrap` en todo td.
const CELDA_LARGA = `${BASE} min-w-44 whitespace-normal`
const CABECERA = `${CELDA} bg-espuma text-xs font-semibold tracking-[0.05em] text-tinta-tenue uppercase`

/**
 * Todas las zonas con todos sus datos. Es tambien la alternativa accesible al
 * mapa: funciona con lector de pantalla, con teclado y sin ver colores.
 */
export function TablaEstado({ zonas, ventana, seleccionada, alSeleccionar }: Props) {
  const { columnas } = textos.estado

  return (
    <div className="overflow-x-auto">
      <table data-testid="tabla-estado" className="w-full border-collapse bg-blanco text-[15px]">
        <thead>
          <tr>
            <th scope="col" className={CABECERA}>
              {columnas.zona}
            </th>
            <th scope="col" className={CABECERA}>
              {columnas.situacion}
            </th>
            <th scope="col" className={CABECERA}>
              {columnas.promedio(ventana)}
            </th>
            <th scope="col" className={CABECERA}>
              {columnas.ultimoDato}
            </th>
            <th scope="col" className={CABECERA}>
              {columnas.alerta}
            </th>
          </tr>
        </thead>
        <tbody>
          {zonas.map((zona) => {
            const code = zona.laboratory.code
            const activa = code === seleccionada
            return (
              <tr
                key={code}
                data-testid={`zona-${code}`}
                className={activa ? 'bg-marea-fondo' : undefined}
              >
                <th scope="row" className={`${CELDA} bg-transparent`}>
                  <button
                    type="button"
                    aria-pressed={activa}
                    onClick={() => alSeleccionar(code)}
                    className="cursor-pointer rounded border-0 bg-transparent p-0 font-cuerpo text-[15px] font-semibold text-abisal underline decoration-espuma-tenue decoration-2 underline-offset-4 hover:decoration-marea focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marea"
                  >
                    {zona.laboratory.name}
                  </button>
                </th>
                <td className={CELDA}>
                  <InsigniaEstado estado={zona.state} testId={`situacion-${code}`} />
                </td>
                <td className={`${CELDA} font-datos tabular-nums`}>
                  {gradosConSigno(zona.average_c)}
                </td>
                <td className={CELDA_LARGA}>
                  {zona.last_measured_on === null ? (
                    '—'
                  ) : (
                    <span className="font-datos tabular-nums">{fechaCorta(zona.last_measured_on)}</span>
                  )}
                  {zona.days_since_last !== null && zona.days_since_last > 0 && (
                    <span className="text-sm text-tinta-tenue">
                      {' '}
                      ({textos.estado.diasSinDato(zona.days_since_last)})
                    </span>
                  )}
                </td>
                <td className={CELDA_LARGA}>
                  {zona.open_alert === null ? (
                    <span className="text-tinta-tenue">{textos.estado.sinAlerta}</span>
                  ) : (
                    <span data-testid={`alerta-${code}`}>
                      {textos.estado.alertaDesde(
                        fechaCorta(zona.open_alert.started_on),
                        zona.open_alert.streak_length,
                      )}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
