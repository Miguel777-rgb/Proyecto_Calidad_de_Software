import {
  Camera,
  Map,
  Marker,
  type CameraRef,
  type LngLatBounds,
  type MapRef,
} from '@maplibre/maplibre-react-native'
import type { EstadoZona } from '@ola/compartido/api'
import { textos } from '@ola/compartido/i18n/textos'
import { COLORES, limitesDe } from '@ola/compartido/mapa/paleta'
import { Scan } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native'
import { color, medida } from '../../tema'
import { ICONOS } from '../estado/Estado'
import { Texto } from '../Texto'

/**
 * Estilo Positron de OpenFreeMap: gris claro, sin clave ni limites de uso.
 * Los mosaicos de OpenStreetMap que usa la web piden que cada app se
 * identifique con su propio User-Agent, y MapLibre no lo permite facilmente
 * (decisiones.md, seccion 19).
 */
export const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/positron'

/** Cuanto se ve el aviso de gestos, como en la web. */
export const DURACION_AVISO = 1500

/** Movimiento minimo de un dedo, en dp, para entender que quiso arrastrar el mapa. */
const ARRASTRE_MINIMO = 4

const ALTO_MAPA = 340

/** Encuadre de toda la costa: [oeste, sur, este, norte], como pide MapLibre. */
export function encuadreDe(zonas: EstadoZona[]): LngLatBounds | null {
  const limites = limitesDe(zonas)
  if (limites === null) return null
  const [sur, oeste] = limites.suroeste
  const [norte, este] = limites.noreste
  return [oeste, sur, este, norte]
}

const coordenada = (zona: EstadoZona): [number, number] => [
  Number(zona.laboratory.longitude),
  Number(zona.laboratory.latitude),
]

interface Props {
  zonas: EstadoZona[]
  seleccionada: string | null
  alElegir: (code: string) => void
  /** Se llama una vez, cuando los marcadores ya estan en su lugar. */
  alDibujar?: () => void
}

/** Dibujo del marcador. Lo pinta MapLibre sobre el mapa; no recibe toques. */
function DibujoMarcador({ zona, elegida }: { zona: EstadoZona; elegida: boolean }) {
  const enAlerta = zona.open_alert !== null
  const sinDatos = zona.state === 'no_data'
  const Icono = ICONOS[zona.state]
  return (
    <View style={estilos.toque} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      {enAlerta && <View style={[estilos.anillo, { borderColor: COLORES[zona.state] }]} />}
      <View
        style={[
          estilos.cuerpo,
          enAlerta && estilos.cuerpoAlerta,
          sinDatos ? estilos.cuerpoSinDatos : { backgroundColor: COLORES[zona.state] },
          elegida && estilos.elegida,
        ]}
      >
        <Icono
          size={sinDatos ? 24 : enAlerta ? 20 : 15}
          color={sinDatos ? COLORES.no_data : color.blanco}
          strokeWidth={sinDatos ? 2.2 : 3}
          aria-hidden
        />
      </View>
    </View>
  )
}

/**
 * Mapa de Inicio. El encuadre inicial muestra toda la costa y no se mueve al
 * elegir una zona. Un dedo desplaza la pantalla; con dos se acerca el mapa.
 *
 * MapLibre pinta los marcadores dentro de su vista nativa, donde Android no
 * los expone a TalkBack ni recibe sus toques. Por eso cada zona tiene ademas
 * un boton transparente de 48 dp en la misma posicion, en una capa encima del
 * mapa: es lo que se toca y lo que TalkBack lee.
 */
export function MapaZonas({ zonas, seleccionada, alElegir, alDibujar }: Props) {
  const mapa = useRef<MapRef>(null)
  const camara = useRef<CameraRef>(null)
  const [movido, setMovido] = useState(false)
  const [aviso, setAviso] = useState(false)
  const [posiciones, setPosiciones] = useState<Record<string, [number, number]> | null>(null)
  const [tamano, setTamano] = useState<{ ancho: number; alto: number } | null>(null)
  const inicioToque = useRef<{ x: number; y: number } | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avisado = useRef(false)
  const ubicacion = useRef(0)
  const encuadre = useMemo(() => encuadreDe(zonas), [zonas])
  // Las zonas en alerta al final: se dibujan encima de sus vecinas.
  const ordenadas = useMemo(
    () => [...zonas].sort((a, b) => Number(a.open_alert !== null) - Number(b.open_alert !== null)),
    [zonas],
  )

  useEffect(
    () => () => {
      if (temporizador.current !== null) clearTimeout(temporizador.current)
      ubicacion.current += 1
    },
    [],
  )

  if (encuadre === null) return null

  /** Donde cae cada zona en la vista, en dp. Una ubicacion vieja se descarta. */
  async function ubicar() {
    const vista = mapa.current
    if (vista === null) return
    const numero = ++ubicacion.current
    try {
      const puntos = await Promise.all(ordenadas.map((zona) => vista.project(coordenada(zona))))
      if (numero !== ubicacion.current) return
      setPosiciones(
        Object.fromEntries(ordenadas.map((zona, i) => [zona.laboratory.code, puntos[i]])),
      )
      if (!avisado.current) {
        avisado.current = true
        alDibujar?.()
      }
    } catch {
      // El mapa se desmonto a mitad de camino: no hay nada que ubicar.
    }
  }

  function mostrarAviso() {
    setAviso(true)
    if (temporizador.current !== null) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setAviso(false), DURACION_AVISO)
  }

  // Si un solo dedo arrastra sobre el mapa, el mapa no se mueve: se avisa por
  // que. Tocar un marcador sin arrastrar no muestra nada.
  function alTocar(evento: GestureResponderEvent) {
    const toques = evento.nativeEvent.touches
    if (toques.length === 1) {
      inicioToque.current = { x: toques[0].pageX, y: toques[0].pageY }
    } else {
      inicioToque.current = null
      setAviso(false)
    }
  }

  function alMover(evento: GestureResponderEvent) {
    const inicio = inicioToque.current
    const toques = evento.nativeEvent.touches
    if (inicio === null) return
    if (toques.length !== 1) {
      inicioToque.current = null
      return
    }
    const distancia = Math.hypot(toques[0].pageX - inicio.x, toques[0].pageY - inicio.y)
    if (distancia >= ARRASTRE_MINIMO) {
      inicioToque.current = null
      mostrarAviso()
    }
  }

  function alMedir(evento: LayoutChangeEvent) {
    const { width, height } = evento.nativeEvent.layout
    setTamano({ ancho: width, alto: height })
  }

  function verTodaLaCosta() {
    if (encuadre === null) return
    camara.current?.fitBounds(encuadre, { duration: 400 })
    setMovido(false)
  }

  // Solo las zonas que se ven: al acercar el mapa, las demas quedan fuera.
  const visibles =
    posiciones === null
      ? []
      : ordenadas.filter((zona) => {
          const punto = posiciones[zona.laboratory.code]
          if (punto === undefined) return false
          if (tamano === null) return true
          const [x, y] = punto
          return x >= 0 && x <= tamano.ancho && y >= 0 && y <= tamano.alto
        })

  return (
    <View
      style={estilos.marco}
      testID="mapa-zonas"
      onTouchStart={alTocar}
      onTouchMove={alMover}
      onLayout={alMedir}
    >
      <Map
        ref={mapa}
        style={estilos.mapa}
        mapStyle={ESTILO_MAPA}
        accessibilityLabel={textos.mapa.titulo}
        dragPan={false}
        touchRotate={false}
        touchPitch={false}
        attribution={false}
        logo={false}
        compass={false}
        onRegionWillChange={(evento) => {
          // Mientras la persona mueve el mapa, los botones quedarian corridos.
          if (evento.nativeEvent.userInteraction) setPosiciones(null)
        }}
        onRegionDidChange={(evento) => {
          if (evento.nativeEvent.userInteraction) setMovido(true)
          void ubicar()
        }}
        onDidFinishRenderingFrame={() => {
          if (!avisado.current) void ubicar()
        }}
      >
        <Camera ref={camara} initialViewState={{ bounds: encuadre }} />
        {ordenadas.map((zona) => (
          <Marker key={zona.laboratory.code} id={zona.laboratory.code} lngLat={coordenada(zona)}>
            <DibujoMarcador zona={zona} elegida={zona.laboratory.code === seleccionada} />
          </Marker>
        ))}
      </Map>

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {visibles.map((zona) => {
          const code = zona.laboratory.code
          const [x, y] = posiciones![code]
          return (
            <Pressable
              key={code}
              testID={`marcador-${code}`}
              accessibilityRole="button"
              accessibilityLabel={textos.mapa.marcador(
                zona.laboratory.name,
                textos.estado[zona.state],
                zona.open_alert !== null,
              )}
              accessibilityState={{ selected: code === seleccionada }}
              onPress={() => alElegir(code)}
              style={[estilos.boton, { left: x - medida.toque / 2, top: y - medida.toque / 2 }]}
            />
          )
        })}
      </View>

      {movido && (
        <Pressable
          accessibilityRole="button"
          testID="ver-toda-la-costa"
          onPress={verTodaLaCosta}
          style={estilos.encuadre}
        >
          <Scan size={18} color={color.abisal} aria-hidden />
          <Texto style={estilos.encuadreTexto}>{textos.movil.verTodaLaCosta}</Texto>
        </Pressable>
      )}

      {aviso && (
        <View
          style={estilos.aviso}
          pointerEvents="none"
          testID="aviso-gesto"
          accessibilityLiveRegion="polite"
        >
          <Texto style={estilos.avisoTexto}>{textos.mapa.gestoTactil}</Texto>
        </View>
      )}

      <Texto
        style={estilos.atribucion}
        accessibilityLabel={textos.movil.atribucionMapaLectura}
        maxFontSizeMultiplier={1.3}
      >
        {textos.movil.atribucionMapa}
      </Texto>
    </View>
  )
}

const estilos = StyleSheet.create({
  marco: {
    height: ALTO_MAPA,
    borderRadius: medida.radioTarjeta,
    borderWidth: 1,
    borderColor: color.borde,
    overflow: 'hidden',
    backgroundColor: '#c9d3d5',
  },
  mapa: { flex: 1 },
  // 48 x 48 dp: el area tactil minima de Android, aunque el dibujo sea menor.
  toque: { width: medida.toque, height: medida.toque, alignItems: 'center', justifyContent: 'center' },
  boton: { position: 'absolute', width: medida.toque, height: medida.toque, borderRadius: 24 },
  cuerpo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: color.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  cuerpoAlerta: { width: 32, height: 32, borderRadius: 16 },
  cuerpoSinDatos: { backgroundColor: color.blanco, borderWidth: 0 },
  anillo: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    opacity: 0.45,
  },
  elegida: { borderWidth: 3, borderColor: color.abisal },
  encuadre: {
    position: 'absolute',
    top: 10,
    right: 10,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.blanco,
    elevation: 3,
  },
  encuadreTexto: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  aviso: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: 'rgba(10, 37, 48, 0.55)',
  },
  avisoTexto: { color: color.espuma, fontWeight: '600', textAlign: 'center' },
  atribucion: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10.5,
    lineHeight: 14,
    color: '#4d5b60',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderTopLeftRadius: 8,
  },
})
