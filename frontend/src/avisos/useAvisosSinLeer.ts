import { useContext } from 'react'
import { AvisosContext, type AvisosSinLeer } from './contexto'

export function useAvisosSinLeer(): AvisosSinLeer {
  return useContext(AvisosContext)
}
