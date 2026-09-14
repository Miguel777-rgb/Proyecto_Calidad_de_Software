import { LogIn } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { textos } from '../../i18n/textos'
import { MenuCuenta } from './MenuCuenta'
import { PESTANAS } from './pestanas'

// Foco visible en dorado: sobre el fondo abisal tiene un contraste de 8.9:1.
const FOCO = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dorado'
const FOCO_INTERIOR =
  'focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-dorado'

function AccesoSinSesion() {
  return (
    <>
      {/* En celular «Crear cuenta» se ofrece desde la pantalla de entrar. */}
      <Link
        to="/registro"
        className={`hidden rounded text-[15px] font-medium text-espuma-tenue no-underline hover:text-espuma hover:underline md:inline ${FOCO}`}
      >
        {textos.navegacion.registrarse}
      </Link>
      <Link
        to="/entrar"
        className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-dorado px-4.5 text-[15px] font-semibold text-abisal no-underline hover:bg-dorado-claro md:min-h-10 ${FOCO}`}
      >
        <LogIn aria-hidden="true" className="size-5" />
        {textos.navegacion.entrar}
      </Link>
    </>
  )
}

export function Cabecera() {
  const { usuario, cargando } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-abisal text-espuma">
      <div className="mx-auto flex h-14 max-w-[60rem] items-center gap-7 px-4 md:h-16">
        <h1 className="m-0 font-titulo text-[26px] leading-none font-bold tracking-[-0.035em]">
          <Link to="/" className={`block rounded py-2 text-espuma no-underline ${FOCO}`}>
            {textos.app.nombre}
          </Link>
        </h1>

        {/* En celular esta navegacion la sustituye la barra inferior. */}
        <nav aria-label={textos.navegacion.principal} className="hidden self-stretch md:flex">
          {PESTANAS.map(({ ruta, texto }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === '/'}
              className={`relative flex items-center px-3.5 text-[15px] font-medium text-espuma-tenue no-underline hover:text-espuma aria-[current=page]:font-semibold aria-[current=page]:text-espuma aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3.5 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-[3px] aria-[current=page]:after:rounded-t-[3px] aria-[current=page]:after:bg-dorado ${FOCO_INTERIOR}`}
            >
              {texto}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {/* Mientras se revalida el token guardado no se sabe si hay sesion:
              mostrar «Entrar» un instante para luego cambiarlo confunde. */}
          {cargando ? null : usuario === null ? <AccesoSinSesion /> : <MenuCuenta usuario={usuario} />}
        </div>
      </div>
    </header>
  )
}
