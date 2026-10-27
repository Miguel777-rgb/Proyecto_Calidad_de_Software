import { Clock, RotateCw, WifiOff } from 'lucide-react'
import { textos } from '@ola/compartido/i18n/textos'

// Siluetas grises con un brillo que recorre; sin animacion si se pide menos
// movimiento. Los colores son tonos de la espuma, no del sistema.
const HUESO =
  'rounded-xl bg-[linear-gradient(90deg,#e3eae8_0%,#edf2f0_50%,#e3eae8_100%)] bg-[length:200%_100%] animate-brillo motion-reduce:animate-none'

/** Esqueleto con la forma de Inicio mientras llega el estado. */
export function EsqueletoInicio() {
  return (
    <div
      role="status"
      aria-label={textos.estado.cargando}
      data-testid="esqueleto-inicio"
      className="grid gap-3 lg:gap-4"
    >
      <div className={`${HUESO} h-[150px] lg:h-24`} />
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr] lg:gap-4">
        <div className={`${HUESO} h-[300px] lg:h-[26rem]`} />
        <div className={`${HUESO} h-[120px] lg:h-44`} />
      </div>
      <div className={`${HUESO} h-[120px] lg:hidden`} />
    </div>
  )
}

const AVISO = 'grid justify-items-start gap-2.5 rounded-2xl border border-borde bg-blanco p-5'
const TITULO_AVISO = 'm-0 font-titulo text-[19px] leading-tight font-semibold'

export function ErrorCarga({ alReintentar }: { alReintentar: () => void }) {
  return (
    <div role="alert" className={AVISO}>
      <WifiOff aria-hidden="true" className="size-7 text-tinta-tenue" />
      <p className={TITULO_AVISO}>{textos.estado.errorCarga}</p>
      <p className="m-0">{textos.estado.errorCargaAyuda}</p>
      <button
        type="button"
        onClick={alReintentar}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-abisal bg-blanco px-4 font-cuerpo text-[15px] font-semibold text-abisal hover:bg-realce focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marea"
      >
        <RotateCw aria-hidden="true" className="size-5" />
        {textos.estado.reintentar}
      </button>
    </div>
  )
}

export function SinDatosCargados() {
  return (
    <div className={AVISO} data-testid="sin-datos">
      <Clock aria-hidden="true" className="size-7 text-tinta-tenue" />
      <p className={TITULO_AVISO}>{textos.estado.sinDatosCargados}</p>
      <p className="m-0">{textos.estado.sinDatosCargadosAyuda}</p>
    </div>
  )
}
