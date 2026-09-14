import { ArrowDown, ArrowUp, CircleDashed, Minus, type LucideIcon } from 'lucide-react'
import type { EstadoTermico } from '../../api/client'
import { textos } from '../../i18n/textos'
import { COLORES, TINTES } from '../mapa/paleta'

// Una forma por estado, para que la situacion no dependa solo del color.
const ICONOS: Record<EstadoTermico, LucideIcon> = {
  warm: ArrowUp,
  neutral: Minus,
  cold: ArrowDown,
  no_data: CircleDashed,
}

/** Simbolo del estado. Decorativo: siempre va junto al nombre del estado. */
export function SimboloEstado({ estado }: { estado: EstadoTermico }) {
  const Icono = ICONOS[estado]

  // Sin datos no lleva relleno: un circulo punteado vacio dice «falta el dato».
  if (estado === 'no_data') {
    return (
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center"
        style={{ color: COLORES.no_data }}
      >
        <Icono className="size-[22px]" strokeWidth={2.2} />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full text-blanco"
      style={{ background: COLORES[estado] }}
    >
      <Icono className="size-[15px]" strokeWidth={2.6} />
    </span>
  )
}

/** Simbolo y nombre del estado sobre su fondo claro. */
export function InsigniaEstado({ estado, testId }: { estado: EstadoTermico; testId?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-1 text-sm font-semibold whitespace-nowrap text-abisal"
      style={{ background: TINTES[estado] }}
    >
      <SimboloEstado estado={estado} />
      <span data-testid={testId}>{textos.estado[estado]}</span>
    </span>
  )
}
