import { textos } from '@ola/compartido/i18n/textos'
import { router, type ErrorBoundaryProps } from 'expo-router'
import { TriangleAlert } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { color, fuente } from '../../tema'
import { Texto } from '../Texto'
import { Boton } from './Boton'

/**
 * Limite de errores de toda la app: un fallo al dibujar una pantalla muestra
 * esto en lugar de cerrar la app. «Volver al mapa» deja a la persona en un
 * lugar conocido y vuelve a intentar dibujar.
 */
export function ErrorInesperado({ retry }: ErrorBoundaryProps) {
  function volverAlMapa() {
    router.replace('/')
    void retry()
  }

  return (
    <View style={estilos.contenedor} testID="error-inesperado">
      <TriangleAlert size={36} color={color.alerta} aria-hidden />
      <Texto accessibilityRole="header" style={estilos.titulo}>
        {textos.errores.inesperado}
      </Texto>
      <Texto style={estilos.ayuda}>{textos.movil.datosASalvo}</Texto>
      <Boton texto={textos.movil.volverAlMapa} alPulsar={volverAlMapa} />
    </View>
  )
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
    backgroundColor: color.espuma,
  },
  titulo: {
    fontFamily: fuente.titulo,
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  ayuda: { color: color['tinta-tenue'], textAlign: 'center', marginBottom: 6 },
})
