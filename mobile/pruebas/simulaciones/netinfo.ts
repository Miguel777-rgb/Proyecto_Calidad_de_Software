/**
 * NetInfo sin el modulo nativo: las pruebas deciden cuando cambia la red con
 * emitirRed().
 */
type EstadoRed = { isConnected: boolean | null; isInternetReachable: boolean | null }
type Oyente = (estado: EstadoRed) => void

const oyentes = new Set<Oyente>()

export function emitirRed(estado: EstadoRed) {
  for (const oyente of [...oyentes]) oyente(estado)
}

export function reiniciarRed() {
  oyentes.clear()
}

const NetInfo = {
  addEventListener: (oyente: Oyente) => {
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  },
  fetch: async (): Promise<EstadoRed> => ({ isConnected: true, isInternetReachable: true }),
}

export default NetInfo
