import { Pressable, StyleSheet } from 'react-native'
import { color, medida } from '../../tema'
import { Texto } from '../Texto'

/** Accion principal de una pantalla: pildora abisal de 52 dp de alto. */
export function Boton({
  texto,
  alPulsar,
  testID,
  desactivado = false,
}: {
  texto: string
  alPulsar: () => void
  testID?: string
  /** Mientras se envia un formulario: no se puede pulsar dos veces. */
  desactivado?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desactivado }}
      disabled={desactivado}
      onPress={alPulsar}
      testID={testID}
      style={({ pressed }) => [
        estilos.boton,
        pressed && estilos.pulsado,
        desactivado && estilos.desactivado,
      ]}
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
  desactivado: { opacity: 0.6 },
  texto: { color: color.espuma, fontWeight: '600', textAlign: 'center' },
})
