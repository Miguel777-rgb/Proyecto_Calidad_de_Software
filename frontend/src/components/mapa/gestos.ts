import L from 'leaflet'
import { GestureHandling } from 'leaflet-gesture-handling'
import { textos } from '@ola/compartido/i18n/textos'

// El plugin solo declara su clase: aqui se tipan las opciones que lee del mapa.
declare module 'leaflet' {
  interface MapOptions {
    gestureHandling?: boolean
    gestureHandlingOptions?: {
      text?: { touch?: string; scroll?: string; scrollMac?: string }
      duration?: number
    }
  }
}

L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling)

/**
 * En celular un dedo desplaza la pagina y dos mueven el mapa; en escritorio
 * la rueda solo acerca con Ctrl. Asi el mapa nunca atrapa el desplazamiento.
 * Si se intenta con un dedo o sin Ctrl, un aviso explica el gesto.
 */
export const OPCIONES_GESTOS: L.MapOptions = {
  gestureHandling: true,
  gestureHandlingOptions: {
    text: {
      touch: textos.mapa.gestoTactil,
      scroll: textos.mapa.gestoRueda,
      scrollMac: textos.mapa.gestoRuedaMac,
    },
    duration: 1500,
  },
}
