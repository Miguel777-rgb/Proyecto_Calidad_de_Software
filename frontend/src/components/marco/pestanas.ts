import { ChartColumnBig, ChartLine, Map as IconoMapa, TrendingUp, type LucideIcon } from 'lucide-react'
import { textos } from '../../i18n/textos'

export interface Pestana {
  ruta: string
  texto: string
  Icono: LucideIcon
}

/**
 * Las cuatro pantallas publicas. El mismo orden en la barra inferior del
 * celular y en la banda desde 768 px, para que nadie tenga que reaprender la
 * navegacion al girar o cambiar de dispositivo.
 */
export const PESTANAS: Pestana[] = [
  { ruta: '/', texto: textos.navegacion.inicio, Icono: IconoMapa },
  { ruta: '/historico', texto: textos.navegacion.historico, Icono: ChartLine },
  { ruta: '/comparar', texto: textos.navegacion.comparacion, Icono: ChartColumnBig },
  { ruta: '/proyeccion', texto: textos.navegacion.proyeccion, Icono: TrendingUp },
]
