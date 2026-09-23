import { StyleSheet, Text, type TextProps } from 'react-native'
import { color, fuente, tamano } from '../tema'

/**
 * Texto con la fuente y el color de OLA. Todo el texto de la app pasa por
 * aqui, asi que ningun texto queda con la fuente del sistema por olvido.
 */
export function Texto({ style, ...props }: TextProps) {
  return <Text {...props} style={[estilos.base, style]} />
}

const estilos = StyleSheet.create({
  base: {
    fontFamily: fuente.cuerpo,
    fontSize: tamano.texto,
    lineHeight: tamano.texto * 1.45,
    color: color.abisal,
  },
})
