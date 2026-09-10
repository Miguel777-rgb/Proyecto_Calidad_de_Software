/**
 * Doble de react-leaflet para las pruebas unitarias.
 *
 * Leaflet mide el tamano real del contenedor y usa APIs de dibujo que jsdom no
 * implementa, asi que el mapa autentico no puede montarse fuera de un
 * navegador. Este doble conserva lo unico que las pruebas necesitan
 * comprobar: que se dibuja un circulo por zona y que al pulsarlo se avisa.
 *
 * El mapa de verdad, con sus mosaicos y su interaccion, se valida en las
 * pruebas de extremo a extremo con Playwright.
 */
import type { ReactNode } from 'react'

interface ConHijos {
  children?: ReactNode
}

export function MapContainer({ children }: ConHijos) {
  return <div data-testid="mapa-leaflet">{children}</div>
}

export function TileLayer({ attribution }: { url: string; attribution?: string }) {
  return <div data-testid="mapa-mosaicos" data-attribution={attribution} />
}

interface CircleMarkerProps extends ConHijos {
  center: [number, number]
  radius: number
  pathOptions?: { fillColor?: string; color?: string; weight?: number; fillOpacity?: number }
  eventHandlers?: { click?: () => void }
}

export function CircleMarker({
  center,
  radius,
  pathOptions,
  eventHandlers,
  children,
}: CircleMarkerProps) {
  return (
    <button
      type="button"
      data-testid="mapa-circulo"
      data-center={center.join(',')}
      data-radius={radius}
      data-color={pathOptions?.fillColor}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </button>
  )
}

export function Tooltip({ children }: ConHijos) {
  return <span data-testid="mapa-globo">{children}</span>
}
