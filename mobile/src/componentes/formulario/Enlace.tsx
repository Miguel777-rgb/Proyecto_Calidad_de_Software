import { Pressable, StyleSheet } from 'react-native'
import { color, medida } from '../../tema'
import { Texto } from '../Texto'

/** Texto subrayado que lleva a otra pantalla, con area tactil de 48 dp. */
export function Enlace({
  texto,
  alPulsar,
  testID,
  alinear = 'center',
}: {
  texto: string
  alPulsar: () => void
  testID?: string
  alinear?: 'center' | 'flex-end'
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={alPulsar}
      testID={testID}
      hitSlop={4}
      style={[estilos.enlace, { alignSelf: alinear }]}
    >
      <Texto style={estilos.texto}>{texto}</Texto>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  enlace: { minHeight: medida.toque, justifyContent: 'center' },
  texto: {
    color: color.marea,
    fontWeight: '600',
    fontSize: 15.5,
    textDecorationLine: 'underline',
  },
})
