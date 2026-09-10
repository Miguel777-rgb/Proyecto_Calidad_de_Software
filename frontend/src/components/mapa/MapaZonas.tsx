import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import type { EstadoZona } from '../../api/client'
import { textos } from '../../i18n/textos'
import { COLORES, limitesDe, radioDe } from './paleta'

interface Props {
  zonas: EstadoZona[]
  seleccionada: string | null
  alSeleccionar: (code: string) => void
}

export function MapaZonas({ zonas, seleccionada, alSeleccionar }: Props) {
  const limites = limitesDe(zonas)
  if (limites === null) return null

  return (
    <div className="mapa" data-testid="mapa-zonas">
      <MapContainer
        bounds={[limites.suroeste, limites.noreste]}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        {/* La atribucion de OpenStreetMap es obligatoria por su licencia, igual
            que la de IMARPE por la del dataset. */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {zonas.map((zona) => {
          const code = zona.laboratory.code
          const activa = code === seleccionada
          return (
            <CircleMarker
              key={code}
              center={[Number(zona.laboratory.latitude), Number(zona.laboratory.longitude)]}
              radius={radioDe(zona)}
              pathOptions={{
                color: activa ? '#12232e' : '#ffffff',
                weight: activa ? 3 : 2,
                fillColor: COLORES[zona.state],
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => alSeleccionar(code) }}
            >
              <Tooltip direction="top">
                {zona.laboratory.name} — {textos.estado[zona.state]}
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
