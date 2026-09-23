import { Pressable, StyleSheet } from 'react-native'
import { color, medida } from '../../tema'
import { Texto } from '../Texto'

/** Accion principal de una pantalla: pildora abisal de 52 dp de alto. */
export function Boton({
  texto,
  alPulsar,
  testID,
}: {
  texto: string
  alPulsar: () => void
  testID?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={alPulsar}
      testID={testID}
      style={({ pressed }) => [estilos.boton, pressed && estilos.pulsado]}
    >
      <Texto style={estilos.texto}>{texto}</Texto>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: medida.toque + 4,
    paddingHorizontal: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.abisal,
  },
  pulsado: { backgroundColor: color['abisal-3'] },
  texto: { color: color.espuma, fontWeight: '600' },
})
