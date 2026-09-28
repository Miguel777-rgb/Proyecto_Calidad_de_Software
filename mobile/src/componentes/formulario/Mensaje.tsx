import { CircleAlert, Clock, Mail } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { color } from '../../tema'
import { Texto } from '../Texto'

type Tipo = 'error' | 'enviado' | 'sesion'

const ESTILO: Record<Tipo, { fondo: string; borde: string; texto: string; icono: string }> = {
  error: {
    fondo: color['error-fondo'],
    borde: color['error-fondo'],
    texto: color.error,
    icono: color.error,
  },
  enviado: {
    fondo: color['marea-fondo'],
    borde: color['marea-fondo'],
    texto: color.abisal,
    icono: color.marea,
  },
  sesion: {
    fondo: color['atencion-fondo'],
    borde: color['atencion-borde'],
    texto: color.abisal,
    icono: color['tinta-tenue'],
  },
}

/**
 * Mensaje de un formulario. Los errores se anuncian como alerta a TalkBack;
 * los demas, como region que cambia.
 */
export function Mensaje({ tipo, texto, testID }: { tipo: Tipo; texto: string; testID?: string }) {
  const estilo = ESTILO[tipo]
  const Icono = tipo === 'error' ? CircleAlert : tipo === 'enviado' ? Mail : Clock
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole={tipo === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion={tipo === 'error' ? 'assertive' : 'polite'}
      style={[estilos.mensaje, { backgroundColor: estilo.fondo, borderColor: estilo.borde }]}
    >
      <Icono size={20} color={estilo.icono} aria-hidden />
      <Texto style={[estilos.texto, { color: estilo.texto }, tipo === 'error' && estilos.fuerte]}>
        {texto}
      </Texto>
    </View>
  )
}

const estilos = StyleSheet.create({
  mensaje: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  texto: { flex: 1, fontSize: 15, lineHeight: 21 },
  fuerte: { fontWeight: '600' },
})
