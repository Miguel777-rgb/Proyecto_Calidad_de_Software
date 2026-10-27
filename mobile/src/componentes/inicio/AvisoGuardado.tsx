import { fechaYHora } from '@ola/compartido/inicio/datos'
import { textos } from '@ola/compartido/i18n/textos'
import { CloudOff } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { color, medida } from '../../tema'
import { Texto } from '../Texto'

interface Props {
  /** Cuando llegaron de la API los datos que se ven, en milisegundos. */
  guardadoEn: number
  alReintentar: () => void
}

/**
 * Sin conexion, con datos guardados: dice de cuando son. La fecha del dato
 * del mar sigue en el resumen, asi que la persona ve las dos.
 */
export function AvisoGuardado({ guardadoEn, alReintentar }: Props) {
  const { fecha, hora } = fechaYHora(new Date(guardadoEn))
  return (
    <View style={estilos.aviso} testID="aviso-guardado" accessibilityLiveRegion="polite">
      <CloudOff size={22} color={color['tinta-tenue']} aria-hidden />
      <Texto style={estilos.texto}>{textos.movil.datosGuardados(fecha, hora)}</Texto>
      <Pressable
        accessibilityRole="button"
        testID="reintentar-guardado"
        onPress={alReintentar}
        style={({ pressed }) => [estilos.boton, pressed && estilos.pulsado]}
      >
        <Texto style={estilos.botonTexto}>{textos.estado.reintentar}</Texto>
      </Pressable>
    </View>
  )
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color['atencion-borde'],
    backgroundColor: color['atencion-fondo'],
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 12,
  },
  texto: { flex: 1, minWidth: 160, fontSize: 14.5, lineHeight: 20 },
  boton: {
    minHeight: medida.toque,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: color.abisal,
  },
  pulsado: { backgroundColor: color['abisal-3'] },
  botonTexto: { color: color.espuma, fontWeight: '600', fontSize: 14.5, lineHeight: 20 },
})
