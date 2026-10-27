import { textos } from '@ola/compartido/i18n/textos'
import { ChartColumnBig, ChartLine, Map as IconoMapa, TrendingUp, type LucideIcon } from 'lucide-react-native'

export interface Pestana {
  /** Nombre de la ruta de expo-router dentro de (tabs). */
  ruta: 'index' | 'historico' | 'comparar' | 'proyeccion'
  texto: string
  Icono: LucideIcon
}

/**
 * Las cuatro pantallas publicas, en el mismo orden que la barra inferior de la
 * web: quien usa las dos no tiene que reaprender la navegacion.
 */
export const PESTANAS: Pestana[] = [
  { ruta: 'index', texto: textos.navegacion.inicio, Icono: IconoMapa },
  { ruta: 'historico', texto: textos.navegacion.historico, Icono: ChartLine },
  { ruta: 'comparar', texto: textos.navegacion.comparacion, Icono: ChartColumnBig },
  { ruta: 'proyeccion', texto: textos.navegacion.proyeccion, Icono: TrendingUp },
]
