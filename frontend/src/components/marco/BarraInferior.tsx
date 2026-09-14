import { NavLink } from 'react-router-dom'
import { textos } from '../../i18n/textos'
import { PESTANAS } from './pestanas'

/**
 * Navegacion principal en celular (menos de 768 px): fija abajo, al alcance
 * del pulgar. Cada pestana mide al menos 56 px de alto, por encima del minimo
 * de 44 px para objetivos tactiles.
 */
export function BarraInferior() {
  return (
    <nav
      aria-label={textos.navegacion.principal}
      data-testid="barra-inferior"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-borde bg-blanco px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden"
    >
      {PESTANAS.map(({ ruta, texto, Icono }) => (
        <NavLink
          key={ruta}
          to={ruta}
          end={ruta === '/'}
          className="group flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-center font-cuerpo text-[12.5px] leading-tight font-medium text-tinta-tenue no-underline focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-marea aria-[current=page]:font-bold aria-[current=page]:text-abisal"
        >
          <span className="grid h-8 w-14 place-items-center rounded-full transition-colors group-aria-[current=page]:bg-abisal group-aria-[current=page]:text-espuma motion-reduce:transition-none">
            <Icono aria-hidden="true" className="size-[22px]" />
          </span>
          {texto}
        </NavLink>
      ))}
    </nav>
  )
}
