/**
 * MapLibre dibuja con codigo nativo, que Jest no tiene. Esta version dibuja
 * vistas comunes con las mismas props, para probar lo que la app decide: que
 * marcadores hay, con que nombre accesible y que pasa al tocarlos o al mover
 * el mapa. El mapa real se prueba en el celular con Maestro.
 */
import { useEffect, useImperativeHandle, type ReactNode, type Ref } from 'react'
import { View, type ViewProps } from 'react-native'

/** La camara de la ultima prueba: permite comprobar que se volvio al encuadre. */
export const camaraSimulada = { fitBounds: jest.fn() }

/**
 * Proyeccion simple y predecible: 20 dp por grado desde 85° O y 2° S. Las
 * zonas de prueba caen dentro de un mapa de 352 x 340 dp.
 */
export const mapaSimulado = {
  project: jest.fn(async ([longitud, latitud]: [number, number]) => [
    (longitud + 85) * 20,
    (-2 - latitud) * 20,
  ]),
}

interface PropsMapa extends ViewProps {
  ref?: Ref<unknown>
  children?: ReactNode
  onDidFinishRenderingFrame?: () => void
  [otra: string]: unknown
}

export function Map({ ref, children, onDidFinishRenderingFrame, ...props }: PropsMapa) {
  useImperativeHandle(ref, () => mapaSimulado)
  // El primer cuadro llega al montar, como en el celular.
  useEffect(() => {
    onDidFinishRenderingFrame?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <View testID="maplibre-mapa" {...props}>
      {children}
    </View>
  )
}

export function Camera({ ref, initialViewState }: { ref?: Ref<unknown>; initialViewState?: unknown }) {
  useImperativeHandle(ref, () => camaraSimulada)
  return <View testID="maplibre-camara" {...({ initialViewState } as ViewProps)} />
}

export function Marker({ id, lngLat, children }: { id?: string; lngLat: [number, number]; children: ReactNode }) {
  return (
    <View testID={`maplibre-marcador-${id}`} {...({ lngLat } as ViewProps)}>
      {children}
    </View>
  )
}
