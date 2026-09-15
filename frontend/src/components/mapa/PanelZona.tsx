import { useId } from 'react'
import type { EstadoZona } from '../../api/client'
import { textos } from '@ola/compartido/i18n/textos'
import { SimboloEstado } from '../inicio/Estado'
import { DetalleZona } from './DetalleZona'

interface Props {
  zona: EstadoZona | null
  /** Todas las zonas, ya ordenadas: de aqui salen los accesos a las alertas. */
  zonas: EstadoZona[]
  ventana: number | null
  alSeleccionar: (code: string) => void
  alCerrar: () => void
}

/** Panel lateral de escritorio: el detalle de la zona elegida o una invitacion. */
export function PanelZona({ zona, zonas, ventana, alSeleccionar, alCerrar }: Props) {
  const idAccesos = useId()
  const enAlerta = zonas.filter((z) => z.open_alert !== null)

  return (
    <aside
      data-testid="panel-zona"
      aria-live="polite"
      className="rounded-2xl border border-borde bg-blanco p-[18px] text-abisal"
    >
      {zona !== null ? (
        <DetalleZona zona={zona} ventana={ventana} alCerrar={alCerrar} />
      ) : (
        <div className="grid gap-3">
          <p className="m-0 text-tinta-tenue">{textos.mapa.sinSeleccion}</p>
          {enAlerta.length > 0 && (
            <>
              <p id={idAccesos} className="m-0 font-semibold">
                {textos.mapa.zonasEnAlerta}
              </p>
              <ul
                aria-labelledby={idAccesos}
                data-testid="accesos-alerta"
                className="m-0 flex list-none flex-wrap gap-2 p-0"
              >
                {enAlerta.map((z) => (
                  <li key={z.laboratory.code}>
                    <button
                      type="button"
                      onClick={() => alSeleccionar(z.laboratory.code)}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-borde bg-blanco py-1 pr-3 pl-1 font-cuerpo text-[15px] font-semibold text-abisal hover:bg-realce focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marea"
                    >
                      <SimboloEstado estado={z.state} />
                      {z.laboratory.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
