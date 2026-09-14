import { Bell, ChevronDown, LogOut, MapPinned, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Usuario } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { useAvisosSinLeer } from '../../avisos/useAvisosSinLeer'
import { textos } from '../../i18n/textos'

const OPCION =
  'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent px-3 text-left font-cuerpo text-[17px] font-medium text-abisal no-underline hover:bg-realce focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-marea md:text-base'
const ICONO_OPCION = 'size-5 shrink-0 text-tinta-tenue'

export function MenuCuenta({ usuario }: { usuario: Usuario }) {
  const { salir } = useAuth()
  const { sinLeer } = useAvisosSinLeer()
  const { pathname } = useLocation()
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const idPanel = useId()

  // Elegir una opcion navega; al cambiar de pantalla el menu se cierra.
  useEffect(() => {
    setAbierto(false)
  }, [pathname])

  useEffect(() => {
    if (!abierto) return

    function alPulsarFuera(evento: PointerEvent) {
      const objetivo = evento.target as Node
      if (!panel.current?.contains(objetivo) && !boton.current?.contains(objetivo)) {
        setAbierto(false)
      }
    }
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setAbierto(false)
      boton.current?.focus()
    }

    document.addEventListener('pointerdown', alPulsarFuera)
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('pointerdown', alPulsarFuera)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [abierto])

  // Elegir la pantalla en la que ya se esta no cambia la ruta: se cierra aqui.
  function alElegir(evento: MouseEvent) {
    if ((evento.target as Element).closest('a') !== null) setAbierto(false)
  }

  const esAdmin = usuario.role === 'admin'
  const etiqueta =
    sinLeer > 0 ? textos.navegacion.menuCuentaConAvisos(sinLeer) : textos.navegacion.menuCuenta

  return (
    <div className="relative">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={etiqueta}
        onClick={() => setAbierto((actual) => !actual)}
        className="group relative inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border border-espuma/20 bg-transparent p-1 font-cuerpo text-sm font-medium text-espuma hover:bg-abisal-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dorado aria-expanded:bg-abisal-3 md:pr-3"
      >
        <span className="grid size-[34px] place-items-center rounded-full bg-abisal-3 group-aria-expanded:bg-abisal-2">
          <UserRound aria-hidden="true" className="size-5" />
        </span>
        <span aria-hidden="true" className="hidden max-w-44 truncate text-espuma-tenue md:inline">
          {usuario.email}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="hidden size-4 text-espuma-tenue transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none md:inline"
        />
        {sinLeer > 0 && (
          <span
            aria-hidden="true"
            data-testid="insignia-avisos"
            className="absolute -top-1 left-[26px] h-5 min-w-5 rounded-full bg-dorado px-1.5 text-center font-datos text-xs leading-5 font-semibold text-abisal shadow-[0_0_0_2px_var(--color-abisal)]"
          >
            {sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div
          ref={panel}
          id={idPanel}
          onClick={alElegir}
          className="absolute top-full right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-borde bg-blanco p-1.5 text-abisal shadow-[0_16px_40px_-8px_rgb(10_37_48/0.28),0_2px_6px_rgb(10_37_48/0.08)] md:w-[300px]"
        >
          <div
            data-testid="sesion-actual"
            className="mb-1.5 grid gap-0.5 border-b border-borde px-3 pt-3 pb-3.5"
          >
            <span className="text-[11.5px] font-semibold tracking-[0.06em] text-tinta-tenue uppercase">
              {textos.inicio.sesionComo}
            </span>
            <span className="font-semibold [overflow-wrap:anywhere]">{usuario.email}</span>
            <span className="mt-1.5 justify-self-start rounded-full bg-marea-fondo px-2.5 py-0.5 text-[12.5px] font-semibold text-marea">
              {esAdmin ? textos.inicio.administrador : textos.inicio.usuario}
            </span>
          </div>

          <ul className="m-0 grid list-none gap-0.5 p-0">
            <li>
              <Link to="/mis-zonas" className={OPCION}>
                <MapPinned aria-hidden="true" className={ICONO_OPCION} />
                {textos.navegacion.misZonas}
              </Link>
            </li>
            <li>
              <Link to="/avisos" className={OPCION}>
                <Bell aria-hidden="true" className={ICONO_OPCION} />
                {textos.navegacion.avisos}{' '}
                {sinLeer > 0 && (
                  <span className="ml-auto rounded-full bg-dorado px-2 py-px font-datos text-[12.5px] font-semibold whitespace-nowrap text-abisal">
                    {textos.avisos.sinLeer(sinLeer)}
                  </span>
                )}
              </Link>
            </li>
            {esAdmin && (
              <li>
                <Link to="/admin" className={OPCION}>
                  <ShieldCheck aria-hidden="true" className={ICONO_OPCION} />
                  {textos.navegacion.administracion}
                </Link>
              </li>
            )}
          </ul>

          <div role="presentation" className="mx-1 my-1.5 h-px bg-borde" />

          <button
            type="button"
            className={OPCION}
            onClick={() => {
              setAbierto(false)
              salir()
            }}
          >
            <LogOut aria-hidden="true" className={ICONO_OPCION} />
            {textos.navegacion.salir}
          </button>
        </div>
      )}
    </div>
  )
}
