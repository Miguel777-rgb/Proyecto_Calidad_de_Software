import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { color, fuente, medida, tamano } from '../../tema'
import { Texto } from '../Texto'
import { Pie } from './Pie'

interface Props {
  titulo?: string
  /** Va antes del titulo: el aviso de datos guardados. */
  aviso?: ReactNode
  /** Con esto, tirar hacia abajo actualiza la pantalla. */
  alActualizar?: () => void
  actualizando?: boolean
  children: ReactNode
}

/**
 * Contenido de una pestana: titulo, lo propio de la pantalla y el pie al
 * final. Con poco contenido el pie queda abajo; con letra grande todo se
 * desplaza, sin cortar nada.
 */
export function Pantalla({ titulo, aviso, alActualizar, actualizando = false, children }: Props) {
  return (
    <ScrollView
      style={estilos.fondo}
      contentContainerStyle={estilos.contenido}
      testID="pantalla"
      refreshControl={
        alActualizar === undefined ? undefined : (
          <RefreshControl
            refreshing={actualizando}
            onRefresh={alActualizar}
            colors={[color.marea]}
            progressBackgroundColor={color.blanco}
          />
        )
      }
    >
      <View style={estilos.cuerpo}>
        {aviso}
        {/* Fuera de las pestanas el titulo ya va en la barra de arriba. */}
        {titulo !== undefined && (
          <Texto accessibilityRole="header" style={estilos.titulo}>
            {titulo}
          </Texto>
        )}
        {children}
      </View>
      <Pie />
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.espuma },
  contenido: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 24,
    paddingHorizontal: medida.margen,
    paddingTop: 20,
  },
  cuerpo: { gap: 16 },
  titulo: {
    fontFamily: fuente.titulo,
    fontWeight: '700',
    fontSize: tamano.tituloPantalla,
    lineHeight: tamano.tituloPantalla * 1.15,
    letterSpacing: -0.6,
  },
})
