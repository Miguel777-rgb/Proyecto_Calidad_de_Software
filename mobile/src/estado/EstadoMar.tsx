import NetInfo from '@react-native-community/netinfo'
import type { Configuracion, EstadoSistema } from '@ola/compartido/api'
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
import { api } from '../api'
import { guardarEstado, leerEstadoGuardado } from './guardado'

/** Dias de vigencia del dato si la configuracion no llega: el mismo valor que la web. */
export const VIGENCIA_POR_DEFECTO = 7

export interface DatosMar {
  estado: EstadoSistema
  /** Dias que promedia el mapa; null si la configuracion no llego. */
  ventana: number | null
  vigencia: number
}

export type EstadoMar =
  | { fase: 'cargando' }
  | { fase: 'error' }
  | {
      fase: 'lista'
      datos: DatosMar
      /** De donde salen los datos que se ven: la API o lo guardado en el celular. */
      origen: 'red' | 'guardado'
      /** Cuando llegaron de la API por ultima vez, en milisegundos. */
      guardadoEn: number
      /** La ultima consulta fallo: se ven los datos guardados. */
      sinConexion: boolean
      /** Hay una actualizacion pedida por la persona en curso. */
      actualizando: boolean
    }

interface ValorEstadoMar {
  estadoMar: EstadoMar
  /** Vuelve a pedir el estado. Si falla, se conserva lo que se ve. */
  actualizar: () => void
}

const Contexto = createContext<ValorEstadoMar | null>(null)

function aDatos(estado: EstadoSistema, configuracion: Configuracion | null): DatosMar {
  return {
    estado,
    ventana: configuracion?.map_window_days ?? null,
    vigencia: configuracion?.freshness_days ?? VIGENCIA_POR_DEFECTO,
  }
}

type Resultado =
  | { ok: true; estado: EstadoSistema; configuracion: Configuracion | null }
  | { ok: false }

/** Estado y configuracion juntos, como la web. Sin configuracion se usan los valores por defecto. */
function pedirDatos(): Promise<Resultado> {
  return Promise.all([api.obtenerEstado(), api.obtenerConfiguracion().catch(() => null)]).then(
    ([estado, configuracion]) => ({ ok: true as const, estado, configuracion }),
    () => ({ ok: false as const }),
  )
}

/**
 * Estado del mar para toda la app: la pestana Mapa y el detalle de cada zona
 * leen lo mismo. Al abrir muestra lo guardado en el celular mientras pide lo
 * nuevo; sin conexion se queda con lo guardado y lo dice. Al volver la red,
 * actualiza solo.
 */
export function ProveedorEstadoMar({ children }: { children: ReactNode }) {
  const [estadoMar, setEstadoMar] = useState<EstadoMar>({ fase: 'cargando' })
  // Cada consulta lleva un numero: la respuesta de una consulta vieja se
  // descarta, como en la web (D-05) y en useConsulta (D-24).
  const consulta = useRef(0)
  const estadoActual = useRef(estadoMar)

  useEffect(() => {
    estadoActual.current = estadoMar
  }, [estadoMar])

  /** Aplica la respuesta de una consulta, si sigue siendo la ultima. */
  const aplicar = useCallback(async (numero: number, respuesta: Promise<Resultado>) => {
    const resultado = await respuesta
    if (numero !== consulta.current) return

    if (resultado.ok) {
      const guardadoEn = Date.now()
      setEstadoMar({
        fase: 'lista',
        datos: aDatos(resultado.estado, resultado.configuracion),
        origen: 'red',
        guardadoEn,
        sinConexion: false,
        actualizando: false,
      })
      await guardarEstado({
        estado: resultado.estado,
        configuracion: resultado.configuracion,
        guardadoEn,
      })
    } else {
      setEstadoMar((previo) =>
        previo.fase === 'lista'
          ? { ...previo, sinConexion: true, actualizando: false }
          : { fase: 'error' },
      )
    }
  }, [])

  // Al abrir: la consulta sale de inmediato y, mientras llega, se muestra lo
  // guardado en el celular.
  useEffect(() => {
    const numero = ++consulta.current
    const respuesta = pedirDatos()
    void leerEstadoGuardado().then((guardado) => {
      if (guardado !== null && numero === consulta.current) {
        setEstadoMar({
          fase: 'lista',
          datos: aDatos(guardado.estado, guardado.configuracion),
          origen: 'guardado',
          guardadoEn: guardado.guardadoEn,
          sinConexion: false,
          actualizando: false,
        })
      }
      return aplicar(numero, respuesta)
    })
  }, [aplicar])

  const actualizar = useCallback(() => {
    const numero = ++consulta.current
    setEstadoMar((previo) =>
      previo.fase === 'lista' ? { ...previo, actualizando: true } : { fase: 'cargando' },
    )
    void aplicar(numero, pedirDatos())
  }, [aplicar])

  // Al volver la red, si lo que se ve es lo guardado o un error, se actualiza
  // sin que la persona tenga que pedirlo. El primer aviso de NetInfo solo dice
  // como esta la red al abrir.
  useEffect(() => {
    let conectadoAntes: boolean | null = null
    return NetInfo.addEventListener((red) => {
      const conectado = red.isConnected === true && red.isInternetReachable !== false
      const actual = estadoActual.current
      const hayQueActualizar =
        actual.fase === 'error' || (actual.fase === 'lista' && actual.sinConexion)
      if (conectado && conectadoAntes === false && hayQueActualizar) actualizar()
      conectadoAntes = conectado
    })
  }, [actualizar])

  const valor = useMemo(() => ({ estadoMar, actualizar }), [estadoMar, actualizar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useEstadoMar(): ValorEstadoMar {
  const valor = useContext(Contexto)
  if (valor === null) throw new Error('useEstadoMar necesita un ProveedorEstadoMar más arriba.')
  return valor
}
