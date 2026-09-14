import 'leaflet/dist/leaflet.css'
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.css'
import './mapa.css'
import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet'
import type { EstadoZona } from '../../api/client'
import { OPCIONES_GESTOS } from './gestos'
import { htmlMarcador } from './marcador'
import { limitesDe } from './paleta'

// Mosaicos de OpenStreetMap pasados a gris claro con CSS (mapa.css), para que
// los colores de estado sean lo unico con color. Se descarto CARTO Positron:
// exige una clave de API. La licencia de OSM obliga a atribuirlo.
const MOSAICOS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATRIBUCION =
  '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

interface Props {
  zonas: EstadoZona[]
  seleccionada: string | null
  alSeleccionar: (code: string) => void
  /** Nombres fijos junto a cada marcador; en celular se taparian entre si. */
  conEtiquetas: boolean
}

function marcarSeleccion(marcador: L.Marker, elegida: boolean) {
  const elemento = marcador.getElement()
  if (!elemento) return
  elemento.classList.toggle('marcador-zona--elegida', elegida)
  elemento.setAttribute('aria-pressed', String(elegida))
}

export function MapaZonas({ zonas, seleccionada, alSeleccionar, conEtiquetas }: Props) {
  const limites = limitesDe(zonas)
  const marcadores = useRef(new Map<string, L.Marker>())
  const seleccionActual = useRef(seleccionada)
  const alSeleccionarActual = useRef(alSeleccionar)

  useEffect(() => {
    alSeleccionarActual.current = alSeleccionar
  }, [alSeleccionar])

  function prepararMarcador(marcador: L.Marker, code: string) {
    marcarSeleccion(marcador, code === seleccionActual.current)
    const elemento = marcador.getElement()
    if (!elemento || elemento.dataset.teclado === 'si') return
    elemento.dataset.teclado = 'si'
    // Leaflet solo reacciona a Enter y con un evento obsoleto (keypress). Como
    // el marcador es un boton, se activa con Enter y con la barra espaciadora.
    L.DomEvent.on(elemento, 'keydown', (evento) => {
      const tecla = (evento as KeyboardEvent).key
      if (tecla !== 'Enter' && tecla !== ' ') return
      L.DomEvent.preventDefault(evento)
      alSeleccionarActual.current(code)
    })
  }

  // Un icono estable por zona: si cambiara al elegir, Leaflet recrearia el
  // marcador y quien navega con teclado perderia el foco.
  const iconos = useMemo(
    () =>
      new Map(
        zonas.map((zona) => [
          zona.laboratory.code,
          L.divIcon({
            className: 'marcador-zona',
            html: htmlMarcador(zona),
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
        ]),
      ),
    [zonas],
  )

  useEffect(() => {
    seleccionActual.current = seleccionada
    for (const [code, marcador] of marcadores.current) {
      marcarSeleccion(marcador, code === seleccionada)
    }
  }, [seleccionada, iconos])

  if (limites === null) return null

  return (
    <div
      className="mapa h-[340px] overflow-hidden rounded-2xl border border-borde lg:h-[32.5rem]"
      data-testid="mapa-zonas"
    >
      {/* El mapa no se mueve al elegir una zona: el encuadre inicial muestra
          toda la costa y nadie pierde la referencia. */}
      <MapContainer
        bounds={[limites.suroeste, limites.noreste]}
        style={{ height: '100%', width: '100%' }}
        {...OPCIONES_GESTOS}
      >
        <TileLayer url={MOSAICOS} subdomains="abcd" attribution={ATRIBUCION} />

        {zonas.map((zona) => {
          const code = zona.laboratory.code
          return (
            <Marker
              key={code}
              position={[Number(zona.laboratory.latitude), Number(zona.laboratory.longitude)]}
              icon={iconos.get(code)!}
              keyboard
              // En celular las zonas vecinas se solapan: la que esta en alerta
              // queda encima, porque es la que mas interesa tocar.
              zIndexOffset={zona.open_alert === null ? 0 : 1000}
              ref={(marcador) => {
                if (marcador) marcadores.current.set(code, marcador)
                else marcadores.current.delete(code)
              }}
              eventHandlers={{
                add: (evento) => prepararMarcador(evento.target, code),
                click: () => alSeleccionar(code),
              }}
            >
              {conEtiquetas && (
                <Tooltip permanent direction="left" offset={[-14, 0]} className="etiqueta-zona">
                  {zona.laboratory.name}
                </Tooltip>
              )}
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
