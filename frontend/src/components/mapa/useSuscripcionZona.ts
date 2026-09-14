import { useEffect, useState } from 'react'
import { ApiError, darseDeBaja, listarSuscripciones, suscribirse } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { useAvisosSinLeer } from '../../avisos/useAvisosSinLeer'
import { textos } from '../../i18n/textos'

export type EstadoSuscripcion = 'cargando' | 'suscrito' | 'no-suscrito'

/**
 * Si el usuario con sesion recibe avisos de una zona, y como cambiarlo. Sin
 * sesion no pide nada: quien lo usa ofrece entrar.
 */
export function useSuscripcionZona(code: string) {
  const { usuario } = useAuth()
  const { refrescar } = useAvisosSinLeer()
  const [estado, setEstado] = useState<EstadoSuscripcion>('cargando')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (usuario === null) return
    let vigente = true
    setEstado('cargando')
    setError(null)
    listarSuscripciones()
      .then((lista) => {
        if (vigente) {
          setEstado(lista.some((s) => s.laboratory.code === code) ? 'suscrito' : 'no-suscrito')
        }
      })
      .catch(() => {
        if (!vigente) return
        setEstado('no-suscrito')
        setError(textos.errores.inesperado)
      })
    return () => {
      vigente = false
    }
  }, [usuario, code])

  async function cambiar(suscribir: boolean) {
    setOcupado(true)
    setError(null)
    try {
      if (suscribir) await suscribirse(code)
      else await darseDeBaja(code)
      setEstado(suscribir ? 'suscrito' : 'no-suscrito')
      // Suscribirse a una zona ya en alerta genera avisos al momento.
      refrescar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setOcupado(false)
    }
  }

  return {
    estado,
    ocupado,
    error,
    suscribir: () => cambiar(true),
    dejar: () => cambiar(false),
  }
}
