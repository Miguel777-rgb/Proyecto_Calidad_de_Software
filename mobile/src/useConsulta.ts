import { useCallback, useEffect, useRef, useState } from 'react'

export type Consulta<T> =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'lista'; datos: T }

/**
 * Pide datos al montar y ofrece reintentar. Una respuesta que llega despues
 * de desmontar la pantalla, o despues de un reintento, se descarta: el mismo
 * defecto aparecio en la web (D-05) y aqui se evita desde el principio.
 *
 * La funcion se guarda en una referencia: si quien llama la escribe en linea
 * se crea una nueva en cada dibujo, y depender de ella repetiria la consulta
 * sin fin.
 */
export function useConsulta<T>(pedir: () => Promise<T>) {
  const [estado, setEstado] = useState<Consulta<T>>({ fase: 'cargando' })
  const [intento, setIntento] = useState(0)
  const pedirActual = useRef(pedir)

  useEffect(() => {
    pedirActual.current = pedir
  }, [pedir])

  useEffect(() => {
    let vigente = true
    pedirActual
      .current()
      .then((datos) => vigente && setEstado({ fase: 'lista', datos }))
      .catch((error: unknown) => {
        if (!vigente) return
        setEstado({ fase: 'error', mensaje: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      vigente = false
    }
  }, [intento])

  // El paso a «cargando» se hace al pedir el reintento y no dentro del efecto:
  // asi el efecto solo reacciona a la respuesta, sin dibujos en cascada.
  const reintentar = useCallback(() => {
    setEstado({ fase: 'cargando' })
    setIntento((n) => n + 1)
  }, [])
  return { estado, reintentar }
}
