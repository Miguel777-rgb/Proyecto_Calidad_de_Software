import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext)
  if (contexto === null) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.')
  }
  return contexto
}
