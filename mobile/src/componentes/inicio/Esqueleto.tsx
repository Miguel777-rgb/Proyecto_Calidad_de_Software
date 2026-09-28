import { textos } from '@ola/compartido/i18n/textos'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from 'react-native'
import { color, medida } from '../../tema'

function Barra({ ancho, alto }: { ancho: DimensionValue; alto: number }) {
  return <View style={[estilos.barra, { width: ancho, height: alto }]} />
}

/**
 * Forma del resumen y del mapa mientras llega el primer estado. Solo se ve la
 * primera vez: despues la app abre con lo guardado. Late suavemente, salvo
 * que el celular pida menos movimiento.
 */
export function Esqueleto() {
  const [opacidad] = useState(() => new Animated.Value(1))

  useEffect(() => {
    let animacion: Animated.CompositeAnimation | null = null
    let vigente = true
    void AccessibilityInfo.isReduceMotionEnabled().then((menosMovimiento) => {
      if (!vigente || menosMovimiento) return
      animacion = Animated.loop(
        Animated.sequence([
          Animated.timing(opacidad, { toValue: 0.55, duration: 700, useNativeDriver: true }),
          Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      )
      animacion.start()
    })
    return () => {
      vigente = false
      animacion?.stop()
    }
  }, [opacidad])

  return (
    <Animated.View
      style={[estilos.esqueleto, { opacity: opacidad }]}
      testID="cargando"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={textos.estado.cargando}
    >
      <View style={estilos.bloque}>
        <Barra ancho="40%" alto={12} />
        <Barra ancho="62%" alto={26} />
        <View style={estilos.espacio} />
        <Barra ancho="30%" alto={12} />
        <Barra ancho="92%" alto={18} />
        <Barra ancho="70%" alto={18} />
      </View>
      <View style={estilos.mapa} />
    </Animated.View>
  )
}

const estilos = StyleSheet.create({
  esqueleto: { gap: 16 },
  bloque: {
    gap: 10,
    padding: 14,
    borderRadius: medida.radioTarjeta,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.blanco,
  },
  barra: { borderRadius: 10, backgroundColor: '#e3eae8' },
  espacio: { height: 8 },
  mapa: { height: 340, borderRadius: medida.radioTarjeta, backgroundColor: '#e3eae8' },
})
