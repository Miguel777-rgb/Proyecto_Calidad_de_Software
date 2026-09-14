import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { listarAvisos } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { AvisosContext } from './contexto'

/**
 * Mantiene el contador de avisos sin leer del usuario con sesion.
 *
 * Se pide al iniciar sesion y cada vez que cambia la pantalla: los avisos se
 * generan en el servidor al evaluar alertas, sin avisar al navegador, asi que
 * cambiar de pantalla es el momento natural de volver a mirar. La pantalla de
 * avisos llama a `refrescar` tras marcarlos como leidos.
 */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const [sinLeer, setSinLeer] = useState(0)
  const [peticion, setPeticion] = useState(0)

  const refrescar = useCallback(() => setPeticion((n) => n + 1), [])

  useEffect(() => {
    if (usuario === null) {
      setSinLeer(0)
      return
    }
    // Sin esta guarda, una respuesta anterior que llegue tarde (por ejemplo,
    // de antes de cerrar sesion) sobrescribe el contador vigente.
    let vigente = true
    listarAvisos()
      .then((datos) => {
        if (vigente) setSinLeer(typeof datos?.unread === 'number' ? datos.unread : 0)
      })
      .catch(() => vigente && setSinLeer(0))
    return () => {
      vigente = false
    }
  }, [usuario, pathname, peticion])

  const valor = useMemo(() => ({ sinLeer, refrescar }), [sinLeer, refrescar])

  return <AvisosContext.Provider value={valor}>{children}</AvisosContext.Provider>
}
