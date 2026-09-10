import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { textos } from '../i18n/textos'

interface Props {
  children: ReactNode
  soloAdmin?: boolean
}

export function RutaProtegida({ children, soloAdmin = false }: Props) {
  const { usuario, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) return <p role="status">{textos.comun.cargando}</p>

  if (usuario === null) {
    // Se recuerda el destino para volver a el tras iniciar sesion.
    return <Navigate to="/entrar" state={{ desde: ubicacion.pathname }} replace />
  }

  if (soloAdmin && usuario.role !== 'admin') {
    return <p role="alert">{textos.errores.soloAdmin}</p>
  }

  return <>{children}</>
}
