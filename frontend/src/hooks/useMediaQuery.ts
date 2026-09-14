import { useEffect, useState } from 'react'

/** Desde este ancho Inicio muestra la tabla en lugar de las tarjetas. */
export const ESCRITORIO = '(min-width: 64rem)'

function seCumple(consulta: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(consulta).matches
    : false
}

/**
 * Indica si se cumple una consulta de medios y se actualiza al cambiar el
 * tamano de la ventana.
 *
 * Se usa en lugar de ocultar con CSS cuando dos vistas no deben existir a la
 * vez: tarjetas y tabla duplicarian identificadores y lecturas de pantalla.
 * Sin matchMedia (jsdom) vale false, que es la vista de celular.
 */
export function useMediaQuery(consulta: string): boolean {
  const [valor, setValor] = useState(() => seCumple(consulta))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const lista = window.matchMedia(consulta)
    const alCambiar = () => setValor(lista.matches)
    alCambiar()
    lista.addEventListener('change', alCambiar)
    return () => lista.removeEventListener('change', alCambiar)
  }, [consulta])

  return valor
}
