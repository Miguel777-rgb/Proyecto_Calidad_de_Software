import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  cambiarContrasena,
  iniciarSesion as apiLogin,
  registrar as apiRegistrar,
  obtenerPerfil,
  tokenStorage,
  type Usuario,
} from '../api/client'

export interface AuthContextValue {
  usuario: Usuario | null
  cargando: boolean
  entrar: (email: string, password: string) => Promise<void>
  registrarse: (email: string, password: string, fullName?: string) => Promise<void>
  /** Cambia la contrasena con el codigo del correo y deja la sesion iniciada. */
  restablecer: (email: string, codigo: string, password: string) => Promise<void>
  salir: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  // Al abrir la aplicacion se revalida el token guardado: puede haber
  // vencido o corresponder a una cuenta ya desactivada.
  useEffect(() => {
    let vigente = true
    if (!tokenStorage.get()) {
      setCargando(false)
      return
    }
    obtenerPerfil()
      .then((u) => vigente && setUsuario(u))
      .catch(() => {
        tokenStorage.clear()
        if (vigente) setUsuario(null)
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [])

  const entrar = useCallback(async (email: string, password: string) => {
    const sesion = await apiLogin({ email, password })
    tokenStorage.set(sesion.access_token)
    setUsuario(sesion.user)
  }, [])

  const registrarse = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const sesion = await apiRegistrar({
        email,
        password,
        ...(fullName ? { full_name: fullName } : {}),
      })
      tokenStorage.set(sesion.access_token)
      setUsuario(sesion.user)
    },
    [],
  )

  const restablecer = useCallback(async (email: string, codigo: string, password: string) => {
    const sesion = await cambiarContrasena({ email, code: codigo, password })
    tokenStorage.set(sesion.access_token)
    setUsuario(sesion.user)
  }, [])

  const salir = useCallback(() => {
    tokenStorage.clear()
    setUsuario(null)
  }, [])

  const value = useMemo(
    () => ({ usuario, cargando, entrar, registrarse, restablecer, salir }),
    [usuario, cargando, entrar, registrarse, restablecer, salir],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
