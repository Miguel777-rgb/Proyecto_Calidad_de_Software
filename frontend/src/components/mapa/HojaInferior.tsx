import { useEffect, useRef, type ReactNode, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'

/** Pixeles que hay que deslizar hacia abajo para cerrar la hoja. */
const UMBRAL_CIERRE = 80

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

interface Props {
  abierta: boolean
  /** Nombre del dialogo para lectores de pantalla. */
  etiqueta: string
  alCerrar: () => void
  children: ReactNode
}

/**
 * Hoja que sube desde abajo (celular). Es un dialogo modal: el resto de la
 * pagina queda inerte, el foco no sale de la hoja y vuelve a donde estaba al
 * cerrarla. Se cierra con Escape, tocando el fondo o deslizandola hacia abajo.
 * Su altura depende del contenido, hasta el 70 % de la pantalla.
 */
export function HojaInferior({ abierta, etiqueta, alCerrar, children }: Props) {
  const hoja = useRef<HTMLDivElement>(null)
  const alCerrarActual = useRef(alCerrar)
  const inicioArrastre = useRef<number | null>(null)
  const desplazamiento = useRef(0)

  useEffect(() => {
    alCerrarActual.current = alCerrar
  }, [alCerrar])

  useEffect(() => {
    if (!abierta) return

    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const raiz = document.getElementById('root')
    const desbordePrevio = document.body.style.overflow
    raiz?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    hoja.current?.focus()

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        alCerrarActual.current()
        return
      }
      if (evento.key !== 'Tab' || hoja.current === null) return
      const enfocables = [...hoja.current.querySelectorAll<HTMLElement>(ENFOCABLES)]
      if (enfocables.length === 0) {
        evento.preventDefault()
        return
      }
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      const activo = document.activeElement
      const fuera = !hoja.current.contains(activo)
      if (evento.shiftKey && (activo === primero || activo === hoja.current || fuera)) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && (activo === ultimo || fuera)) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      raiz?.removeAttribute('inert')
      document.body.style.overflow = desbordePrevio
      if (previo?.isConnected) previo.focus()
    }
  }, [abierta])

  // Deslizar hacia abajo solo arrastra la hoja si su contenido esta arriba
  // del todo; si no, el gesto desplaza el contenido como siempre.
  function alTocar(evento: TouchEvent) {
    if ((hoja.current?.scrollTop ?? 0) > 0) return
    inicioArrastre.current = evento.touches[0]?.clientY ?? null
    desplazamiento.current = 0
  }

  function alMover(evento: TouchEvent) {
    if (inicioArrastre.current === null || hoja.current === null) return
    const y = evento.touches[0]?.clientY ?? inicioArrastre.current
    desplazamiento.current = Math.max(0, y - inicioArrastre.current)
    hoja.current.style.transform = `translateY(${desplazamiento.current}px)`
  }

  function alSoltar() {
    if (inicioArrastre.current === null || hoja.current === null) return
    inicioArrastre.current = null
    hoja.current.style.transform = ''
    if (desplazamiento.current > UMBRAL_CIERRE) alCerrar()
  }

  if (!abierta) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        data-testid="fondo-hoja"
        onClick={alCerrar}
        className="absolute inset-0 bg-abisal/40 motion-safe:animate-aparecer"
      />
      <div
        ref={hoja}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        data-testid="hoja-zona"
        onTouchStart={alTocar}
        onTouchMove={alMover}
        onTouchEnd={alSoltar}
        className="absolute inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto rounded-t-[22px] bg-blanco px-[18px] pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[17px] text-abisal shadow-[0_-12px_32px_rgb(10_37_48/0.22)] outline-none motion-safe:animate-subir"
      >
        <div aria-hidden="true" className="mx-auto mt-1 mb-3 h-[5px] w-11 rounded-full bg-espuma-tenue" />
        {children}
      </div>
    </div>,
    document.body,
  )
}
