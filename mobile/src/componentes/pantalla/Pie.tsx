import { textos } from '@ola/compartido/i18n/textos'
import { StyleSheet, View } from 'react-native'
import { color, tamano } from '../../tema'
import { Texto } from '../Texto'

/** Descripcion, alcance y atribucion obligatoria a IMARPE (SRS 3.6). */
export function Pie() {
  return (
    <View style={estilos.pie}>
      <Texto style={estilos.descripcion}>{textos.app.descripcion}</Texto>
      <Texto style={estilos.nota}>{textos.app.avisoAlcance}</Texto>
      <Texto style={estilos.nota} testID="atribucion">
        {textos.atribucion}
      </Texto>
    </View>
  )
}

const estilos = StyleSheet.create({
  pie: {
    gap: 6,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: color.borde,
  },
  descripcion: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  nota: { fontSize: tamano.pie, lineHeight: 19, color: color['tinta-tenue'] },
})
