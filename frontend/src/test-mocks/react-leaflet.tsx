/**
 * Doble de react-leaflet para las pruebas unitarias.
 *
 * Leaflet mide el tamano real del contenedor y usa APIs de dibujo que jsdom no
 * implementa, asi que el mapa autentico no puede montarse fuera de un
 * navegador. Este doble conserva lo unico que las pruebas necesitan
 * comprobar: que se dibuja un marcador por zona, con que contenido, y que al
 * pulsarlo se avisa.
 *
 * El mapa de verdad, con sus mosaicos, gestos y teclado, se valida en las
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

interface MarkerProps extends ConHijos {
  position: [number, number]
  icon?: { options?: { html?: string } }
  eventHandlers?: { click?: () => void }
}

export function Marker({ position, icon, eventHandlers, children }: MarkerProps) {
  return (
    <button
      type="button"
      data-testid="mapa-marcador"
      data-center={position.join(',')}
      data-html={icon?.options?.html ?? ''}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </button>
  )
}

export function Tooltip({ children }: ConHijos) {
  return <span data-testid="mapa-etiqueta">{children}</span>
}
