import { textos } from '@ola/compartido/i18n/textos'
import { Hourglass } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { color, medida, tamano } from '../../tema'
import { Texto } from '../Texto'

/**
 * Lugar de una pantalla que llega en una fase posterior. Desaparece cuando esa
 * fase la implementa; mientras tanto la navegacion completa ya se puede probar.
 */
export function Provisional({ texto, fase }: { texto: string; fase: number }) {
  return (
    <View style={estilos.caja} testID="provisional">
      <Hourglass size={26} color={color['tinta-tenue']} aria-hidden />
      <Texto style={estilos.texto}>{texto}</Texto>
      <View style={estilos.chip}>
        <Texto style={estilos.chipTexto}>{textos.movil.fase(fase)}</Texto>
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  caja: {
    gap: 10,
    alignItems: 'flex-start',
    padding: 18,
    borderRadius: medida.radioTarjeta,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.borde,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  texto: { color: color['tinta-tenue'] },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: color.realce,
  },
  chipTexto: {
    fontSize: tamano.etiqueta,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: color['tinta-tenue'],
  },
})
