import { textos } from '@ola/compartido/i18n/textos'
import { Bell, Check, LogIn } from 'lucide-react-native'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { useSesion } from '../../sesion'
import { useZonasSeguidas } from '../../suscripciones'
import { color, medida } from '../../tema'
import { Mensaje } from '../formulario/Mensaje'
import { Texto } from '../Texto'
import { Accion } from './DetalleZona'

interface Props {
  code: string
  nombre: string
  /** Sin sesion, lleva a Entrar y de vuelta a esta zona. */
  alEntrar: () => void
}

/**
 * Recibir avisos de una zona desde su detalle (RF-07), como en la web: sin
 * sesion invita a entrar; con sesion, un toque suscribe o da de baja. TalkBack
 * anuncia el cambio.
 */
export function AvisosZona({ code, nombre, alEntrar }: Props) {
  const { usuario } = useSesion()
  const zonas = useZonasSeguidas()

  if (usuario === null) {
    return (
      <Accion
        testID="entrar-para-avisos"
        texto={textos.mapa.entraParaAvisos}
        icono={<LogIn size={20} color={color.abisal} aria-hidden />}
        alPulsar={alEntrar}
      />
    )
  }

  if (zonas.estado === 'cargando') {
    return (
      <View style={estilos.cargando} testID="avisos-cargando">
        <ActivityIndicator color={color.marea} accessibilityLabel={textos.comun.cargando} />
      </View>
    )
  }

  if (zonas.estado === 'error') {
    return (
      <Mensaje tipo="error" texto={zonas.error ?? textos.errores.inesperado} testID="error-avisos" />
    )
  }

  const seguida = zonas.seguidas.has(code)
  const ocupada = zonas.ocupada === code

  return (
    <View style={estilos.bloque} accessibilityLiveRegion="polite">
      {seguida ? (
        <View style={estilos.suscrito} testID="avisos-zona">
          <View style={estilos.suscritoTexto}>
            <Check size={20} color={color.marea} aria-hidden />
            <Texto style={estilos.fuerte}>{textos.mapa.recibesAvisos(nombre)}</Texto>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: ocupada }}
            disabled={ocupada}
            testID="dejar-de-recibir"
            onPress={() => void zonas.alternar(code)}
            style={({ pressed }) => [estilos.dejar, pressed && estilos.dejarPulsado]}
          >
            <Texto style={estilos.dejarTexto}>{textos.mapa.dejarDeRecibir}</Texto>
          </Pressable>
        </View>
      ) : (
        <Accion
          primaria
          desactivada={ocupada}
          testID="recibir-avisos"
          texto={textos.mapa.recibirAvisos(nombre)}
          icono={<Bell size={20} color={color.espuma} aria-hidden />}
          alPulsar={() => void zonas.alternar(code)}
        />
      )}
      {zonas.error !== null && <Mensaje tipo="error" texto={zonas.error} testID="error-avisos" />}
    </View>
  )
}

const estilos = StyleSheet.create({
  bloque: { gap: 8 },
  cargando: { minHeight: medida.toque, justifyContent: 'center' },
  suscrito: {
    minHeight: medida.toque + 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 12,
    backgroundColor: color['marea-fondo'],
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
  },
  suscritoTexto: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fuerte: { flexShrink: 1, fontWeight: '600', fontSize: 15.5, lineHeight: 21 },
  dejar: {
    minHeight: medida.toque - 4,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: color.marea,
    backgroundColor: color.blanco,
    paddingHorizontal: 12,
  },
  dejarPulsado: { backgroundColor: color.realce },
  dejarTexto: { color: color.marea, fontWeight: '600', fontSize: 14, lineHeight: 20 },
})
