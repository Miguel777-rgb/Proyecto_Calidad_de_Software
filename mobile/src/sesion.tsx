import { ApiError, type Sesion as SesionApi, type Usuario } from '@ola/compartido/api'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { almacenToken, almacenUsuario, api, escucharSesionPerdida } from './api'

export interface Sesion {
  usuario: Usuario | null
  /** Se esta leyendo la sesion guardada al abrir la app. */
  cargando: boolean
  /** Avisos sin leer, para el numero del boton de cuenta. Llegan en la fase 4. */
  sinLeer: number
  /** La API cerro la sesion a mitad de uso: vencio o se cambio la contrasena. */
  sesionTermino: boolean
  /** Ya se aviso de la sesion terminada: el aviso no se repite. */
  olvidarSesionTermino: () => void
  entrar: (email: string, password: string) => Promise<void>
  registrarse: (email: string, password: string, nombre?: string) => Promise<void>
  restablecer: (email: string, codigo: string, password: string) => Promise<void>
  salir: () => Promise<void>
}

const nada = async () => {}

export const SIN_SESION: Sesion = {
  usuario: null,
  cargando: false,
  sinLeer: 0,
  sesionTermino: false,
  olvidarSesionTermino: () => {},
  entrar: nada,
  registrarse: nada,
  restablecer: nada,
  salir: nada,
}

const ContextoSesion = createContext<Sesion>(SIN_SESION)

/**
 * Sesion real de la app (RF-07). Pide siempre la sesion de 30 dias: el token
 * va cifrado en el celular. Al abrir, muestra la sesion guardada y la revisa
 * con la API; sin conexion la conserva.
 */
function SesionReal({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sesionTermino, setSesionTermino] = useState(false)
  // Mientras se revisa la sesion guardada, un 401 solo significa que vencio
  // con la app cerrada: se cierra sin avisar, porque nadie estaba haciendo nada.
  const revisando = useRef(true)

  const cerrarEnElCelular = useCallback(async () => {
    setUsuario(null)
    await Promise.all([almacenToken.clear(), almacenUsuario.clear()])
  }, [])

  useEffect(() => {
    let vigente = true
    void (async () => {
      const token = await almacenToken.get()
      if (token === null) {
        revisando.current = false
        if (vigente) setCargando(false)
        return
      }
      const guardado = await almacenUsuario.get()
      if (vigente) {
        setUsuario(guardado)
        setCargando(false)
      }
      try {
        const perfil = await api.obtenerPerfil()
        if (!vigente) return
        setUsuario(perfil)
        await almacenUsuario.set(perfil)
      } catch (error) {
        if (vigente && error instanceof ApiError && error.status === 401) await cerrarEnElCelular()
        // Sin conexion se queda la sesion guardada.
      } finally {
        revisando.current = false
      }
    })()
    return () => {
      vigente = false
    }
  }, [cerrarEnElCelular])

  useEffect(
    () =>
      escucharSesionPerdida(() => {
        if (revisando.current) return
        setSesionTermino(true)
        void cerrarEnElCelular()
      }),
    [cerrarEnElCelular],
  )

  const guardar = useCallback(async (sesion: SesionApi) => {
    await Promise.all([almacenToken.set(sesion.access_token), almacenUsuario.set(sesion.user)])
    setUsuario(sesion.user)
    setSesionTermino(false)
  }, [])

  const entrar = useCallback(
    async (email: string, password: string) => {
      await guardar(await api.iniciarSesion({ email, password, mantener_sesion: true }))
    },
    [guardar],
  )

  const registrarse = useCallback(
    async (email: string, password: string, nombre?: string) => {
      await guardar(
        await api.registrar({
          email,
          password,
          ...(nombre ? { full_name: nombre } : {}),
          mantener_sesion: true,
        }),
      )
    },
    [guardar],
  )

  const restablecer = useCallback(
    async (email: string, codigo: string, password: string) => {
      await guardar(
        await api.cambiarContrasena({ email, code: codigo, password, mantener_sesion: true }),
      )
    },
    [guardar],
  )

  const olvidarSesionTermino = useCallback(() => setSesionTermino(false), [])

  const valor = useMemo<Sesion>(
    () => ({
      usuario,
      cargando,
      sinLeer: 0,
      sesionTermino,
      olvidarSesionTermino,
      entrar,
      registrarse,
      restablecer,
      salir: cerrarEnElCelular,
    }),
    [
      usuario,
      cargando,
      sesionTermino,
      olvidarSesionTermino,
      entrar,
      registrarse,
      restablecer,
      cerrarEnElCelular,
    ],
  )
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

/**
 * La sesion de la app. Las pruebas del marco le entregan una sesion fija con
 * `valor`; sin `valor` es la sesion real.
 */
export function ProveedorSesion({ valor, children }: { valor?: Sesion; children: ReactNode }) {
  if (valor !== undefined) {
    return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
  }
  return <SesionReal>{children}</SesionReal>
}

export const useSesion = () => useContext(ContextoSesion)
