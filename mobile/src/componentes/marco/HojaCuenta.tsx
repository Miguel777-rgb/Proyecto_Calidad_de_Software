import type { Usuario } from '@ola/compartido/api'
import { textos } from '@ola/compartido/i18n/textos'
import { Bell, ChevronRight, LogOut, MapPinned, type LucideIcon } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, medida, tamano } from '../../tema'
import { Texto } from '../Texto'

/** Distancia o velocidad de arrastre hacia abajo que cierra la hoja. */
export const UMBRAL_CIERRE = { distancia: 80, velocidad: 1.2 }

export function debeCerrar(dy: number, vy: number): boolean {
  return dy > UMBRAL_CIERRE.distancia || (dy > 20 && vy > UMBRAL_CIERRE.velocidad)
}

export type DestinoCuenta = 'mis-zonas' | 'avisos'

interface Props {
  visible: boolean
  usuario: Usuario
  sinLeer: number
  alCerrar: () => void
  alIr: (destino: DestinoCuenta) => void
  alSalir: () => void
}

/**
 * Menu de cuenta en una hoja que sube desde abajo, el patron de Android.
 * Se cierra deslizando hacia abajo, con «atras», tocando fuera o al elegir.
 */
export function HojaCuenta({ visible, usuario, sinLeer, alCerrar, alIr, alSalir }: Props) {
  const { bottom } = useSafeAreaInsets()
  const [desplazamiento] = useState(() => new Animated.Value(0))
  const arrastre = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => desplazamiento.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (debeCerrar(g.dy, g.vy)) alCerrar()
          Animated.spring(desplazamiento, { toValue: 0, useNativeDriver: true }).start()
        },
      }),
    [alCerrar, desplazamiento],
  )

  const esAdmin = usuario.role === 'admin'

  function elegir(destino: DestinoCuenta) {
    alCerrar()
    alIr(destino)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={alCerrar}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={textos.movil.cerrarCuenta}
        onPress={alCerrar}
        style={estilos.velo}
        testID="velo-cuenta"
      />
      {/* Modal abre su propia ventana: TalkBack no sale de ella mientras esta abierta. */}
      <Animated.View
        style={[
          estilos.hoja,
          { paddingBottom: bottom + 8, transform: [{ translateY: desplazamiento }] },
        ]}
        testID="hoja-cuenta"
        {...arrastre.panHandlers}
      >
        <View style={estilos.asa} />
        <View style={estilos.sesion} testID="sesion-actual">
          <Texto style={estilos.etiqueta}>{textos.inicio.sesionComo}</Texto>
          <Texto style={estilos.correo}>{usuario.email}</Texto>
          <View style={estilos.rol}>
            <Texto style={estilos.rolTexto}>
              {esAdmin ? textos.inicio.administrador : textos.inicio.usuario}
            </Texto>
          </View>
        </View>

        <Opcion Icono={MapPinned} texto={textos.navegacion.misZonas} alPulsar={() => elegir('mis-zonas')} />
        <Opcion
          Icono={Bell}
          texto={textos.navegacion.avisos}
          extra={sinLeer > 0 ? textos.avisos.sinLeer(sinLeer) : undefined}
          alPulsar={() => elegir('avisos')}
        />
        {esAdmin && <Texto style={estilos.nota}>{textos.movil.administracionEnLaWeb}</Texto>}
        <Opcion
          Icono={LogOut}
          texto={textos.navegacion.salir}
          sinFlecha
          alPulsar={() => {
            alCerrar()
            alSalir()
          }}
        />
      </Animated.View>
    </Modal>
  )
}

function Opcion({
  Icono,
  texto,
  extra,
  sinFlecha = false,
  alPulsar,
}: {
  Icono: LucideIcon
  texto: string
  extra?: string
  sinFlecha?: boolean
  alPulsar: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={extra ? `${texto}, ${extra}` : texto}
      onPress={alPulsar}
      style={({ pressed }) => [estilos.opcion, pressed && estilos.opcionPulsada]}
    >
      <Icono size={22} color={color['tinta-tenue']} aria-hidden />
      <Texto style={estilos.opcionTexto}>{texto}</Texto>
      {extra !== undefined && (
        <View style={estilos.sinLeer}>
          <Texto style={estilos.sinLeerTexto}>{extra}</Texto>
        </View>
      )}
      {!sinFlecha && <ChevronRight size={18} color={color['tinta-tenue']} aria-hidden />}
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  velo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(10,37,48,0.46)' },
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: medida.margen,
    paddingTop: 10,
    gap: 2,
    backgroundColor: color.blanco,
    borderTopLeftRadius: medida.radioHoja,
    borderTopRightRadius: medida.radioHoja,
    elevation: 16,
  },
  asa: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 4,
    backgroundColor: color.borde,
    marginTop: 4,
    marginBottom: 12,
  },
  sesion: {
    gap: 2,
    paddingHorizontal: 4,
    paddingBottom: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: color.borde,
  },
  etiqueta: {
    fontSize: tamano.etiqueta,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: color['tinta-tenue'],
  },
  correo: { fontWeight: '600' },
  rol: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: color['marea-fondo'],
  },
  rolTexto: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: color.marea },
  opcion: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  opcionPulsada: { backgroundColor: color.realce },
  opcionTexto: { flex: 1, fontWeight: '500' },
  sinLeer: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: color.dorado },
  sinLeerTexto: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  nota: { fontSize: tamano.secundario, color: color['tinta-tenue'], paddingHorizontal: 6, paddingVertical: 8 },
})
