import { ApiError } from '@ola/compartido/api'
import { textos } from '@ola/compartido/i18n/textos'
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
import { api } from './api'
import { useSesion } from './sesion'

export interface ZonasSeguidas {
  /** Sin sesion no hay zonas; mientras llegan, tampoco. */
  estado: 'sin-sesion' | 'cargando' | 'lista' | 'error'
  seguidas: ReadonlySet<string>
  /** La zona que se esta cambiando, para desactivar su control. */
  ocupada: string | null
  error: string | null
  alternar: (code: string) => Promise<void>
  recargar: () => void
}

const NINGUNA: ReadonlySet<string> = new Set()

const Contexto = createContext<ZonasSeguidas>({
  estado: 'sin-sesion',
  seguidas: NINGUNA,
  ocupada: null,
  error: null,
  alternar: async () => {},
  recargar: () => {},
})

interface Cargadas {
  /** De quien son: al cambiar de cuenta, las de la anterior dejan de valer. */
  usuarioId: number
  seguidas: ReadonlySet<string>
}

const mensajeDe = (error: unknown) =>
  error instanceof ApiError ? error.message : textos.errores.inesperado

/**
 * Las zonas que sigue la persona (RF-07). Las leen el detalle de cada zona y
 * «Mis zonas». Son datos personales: al cerrar sesion se olvidan.
 */
export function ProveedorZonasSeguidas({ children }: { children: ReactNode }) {
  const { usuario } = useSesion()
  const usuarioId = usuario?.id ?? null
  const [cargadas, setCargadas] = useState<Cargadas | null>(null)
  const [fallo, setFallo] = useState<{ usuarioId: number; mensaje: string } | null>(null)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const consulta = useRef(0)

  useEffect(() => {
    if (usuarioId === null) return
    const numero = ++consulta.current
    api
      .listarSuscripciones()
      .then((lista) => {
        if (numero !== consulta.current) return
        setCargadas({ usuarioId, seguidas: new Set(lista.map((s) => s.laboratory.code)) })
      })
      .catch((e: unknown) => {
        if (numero !== consulta.current) return
        setFallo({ usuarioId, mensaje: mensajeDe(e) })
      })
  }, [usuarioId, intento])

  const alternar = useCallback(
    async (code: string) => {
      if (usuarioId === null || cargadas?.usuarioId !== usuarioId) return
      setError(null)
      setOcupada(code)
      const seguia = cargadas.seguidas.has(code)
      try {
        if (seguia) await api.darseDeBaja(code)
        else await api.suscribirse(code)
        setCargadas((actual) => {
          if (actual === null || actual.usuarioId !== usuarioId) return actual
          const nuevas = new Set(actual.seguidas)
          if (seguia) nuevas.delete(code)
          else nuevas.add(code)
          return { usuarioId, seguidas: nuevas }
        })
      } catch (e) {
        setError(mensajeDe(e))
      } finally {
        setOcupada(null)
      }
    },
    [usuarioId, cargadas],
  )

  const recargar = useCallback(() => {
    setFallo(null)
    setIntento((n) => n + 1)
  }, [])

  const valor = useMemo<ZonasSeguidas>(() => {
    const base = { alternar, recargar }
    if (usuarioId === null) {
      return { ...base, estado: 'sin-sesion', seguidas: NINGUNA, ocupada: null, error: null }
    }
    if (cargadas?.usuarioId === usuarioId) {
      return { ...base, estado: 'lista', seguidas: cargadas.seguidas, ocupada, error }
    }
    if (fallo?.usuarioId === usuarioId) {
      return { ...base, estado: 'error', seguidas: NINGUNA, ocupada: null, error: fallo.mensaje }
    }
    return { ...base, estado: 'cargando', seguidas: NINGUNA, ocupada: null, error: null }
  }, [usuarioId, cargadas, fallo, ocupada, error, alternar, recargar])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export const useZonasSeguidas = () => useContext(Contexto)
