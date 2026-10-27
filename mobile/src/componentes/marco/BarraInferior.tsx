import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, LETRA_MAXIMA, medida, tamano } from '../../tema'
import { Texto } from '../Texto'
import { PESTANAS, type Pestana } from './pestanas'

export interface PropsBarra {
  /** Ruta activa. */
  actual: Pestana['ruta']
  alElegir: (ruta: Pestana['ruta']) => void
}

/**
 * Barra inferior: la pestana activa lleva una pildora abisal, como en la web.
 * Se pinta tambien bajo la zona de gestos de Android, que desde Android 15
 * dibuja la app de borde a borde.
 */
export function BarraInferior({ actual, alElegir }: PropsBarra) {
  const { bottom } = useSafeAreaInsets()

  return (
    <View
      accessibilityRole="tablist"
      style={[estilos.barra, { paddingBottom: bottom }]}
      testID="barra-inferior"
    >
      {PESTANAS.map(({ ruta, texto, Icono }) => {
        const activa = ruta === actual
        return (
          <Pressable
            key={ruta}
            accessibilityRole="tab"
            accessibilityLabel={texto}
            accessibilityState={{ selected: activa }}
            onPress={() => alElegir(ruta)}
            style={estilos.pestana}
            testID={`pestana-${ruta}`}
          >
            <View style={[estilos.pildora, activa && estilos.pildoraActiva]}>
              <Icono size={22} color={activa ? color.espuma : color['tinta-tenue']} aria-hidden />
            </View>
            <Texto
              maxFontSizeMultiplier={LETRA_MAXIMA.barra}
              numberOfLines={2}
              style={[estilos.texto, activa && estilos.textoActivo]}
            >
              {texto}
            </Texto>
          </Pressable>
        )
      })}
    </View>
  )
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingHorizontal: 4,
    backgroundColor: color.blanco,
    borderTopWidth: 1,
    borderTopColor: color.borde,
  },
  pestana: {
    flex: 1,
    minHeight: medida.pestana,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  pildora: {
    width: 60,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pildoraActiva: { backgroundColor: color.abisal },
  texto: {
    fontSize: tamano.pestana,
    lineHeight: tamano.pestana * 1.25,
    fontWeight: '500',
    textAlign: 'center',
    color: color['tinta-tenue'],
  },
  textoActivo: { fontWeight: '700', color: color.abisal },
})
