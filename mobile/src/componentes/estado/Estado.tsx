import type { EstadoTermico } from '@ola/compartido/api'
import { textos } from '@ola/compartido/i18n/textos'
import { COLORES, TINTES } from '@ola/compartido/mapa/paleta'
import { ArrowDown, ArrowUp, CircleDashed, Minus, type LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { color } from '../../tema'
import { Texto } from '../Texto'

// Una forma por estado, para que la situacion no dependa solo del color.
export const ICONOS: Record<EstadoTermico, LucideIcon> = {
  warm: ArrowUp,
  neutral: Minus,
  cold: ArrowDown,
  no_data: CircleDashed,
}

/** Simbolo del estado. Decorativo: siempre va junto al nombre del estado. */
export function SimboloEstado({ estado, medida = 22 }: { estado: EstadoTermico; medida?: number }) {
  const Icono = ICONOS[estado]
  const marco = { width: medida, height: medida, borderRadius: medida / 2 }
  // Sin datos no lleva relleno: un circulo punteado vacio dice «falta el dato».
  if (estado === 'no_data') {
    return (
      <View style={[estilos.simbolo, marco]} importantForAccessibility="no-hide-descendants">
        <Icono size={medida} color={COLORES.no_data} strokeWidth={2.2} aria-hidden />
      </View>
    )
  }
  return (
    <View
      style={[estilos.simbolo, marco, { backgroundColor: COLORES[estado] }]}
      importantForAccessibility="no-hide-descendants"
    >
      <Icono size={medida * 0.66} color={color.blanco} strokeWidth={2.6} aria-hidden />
    </View>
  )
}

/** Simbolo y nombre del estado sobre su fondo claro. */
export function InsigniaEstado({ estado, testID }: { estado: EstadoTermico; testID?: string }) {
  return (
    <View style={[estilos.insignia, { backgroundColor: TINTES[estado] }]}>
      <SimboloEstado estado={estado} />
      <Texto style={estilos.nombre} testID={testID}>
        {textos.estado[estado]}
      </Texto>
    </View>
  )
}

const estilos = StyleSheet.create({
  simbolo: { alignItems: 'center', justifyContent: 'center' },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 3,
    paddingLeft: 4,
    paddingRight: 11,
  },
  nombre: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
})
