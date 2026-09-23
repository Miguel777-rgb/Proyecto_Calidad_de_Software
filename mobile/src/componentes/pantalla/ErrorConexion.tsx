import { textos } from '@ola/compartido/i18n/textos'
import { CloudOff } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { color, fuente } from '../../tema'
import { Texto } from '../Texto'
import { Boton } from './Boton'

/**
 * La API no respondio. Mismos textos que la web. Desde la fase 2, si hay un
 * estado guardado, se muestra ese estado con su fecha en lugar de esto.
 */
export function ErrorConexion({ alReintentar }: { alReintentar: () => void }) {
  return (
    <View style={estilos.contenedor} testID="error-conexion">
      <View style={estilos.aro}>
        <CloudOff size={34} color={color.marea} aria-hidden />
      </View>
      <Texto accessibilityRole="header" style={estilos.titulo}>
        {textos.estado.errorCarga}
      </Texto>
      <Texto style={estilos.ayuda}>{textos.estado.errorCargaAyuda}</Texto>
      <Boton texto={textos.estado.reintentar} alPulsar={alReintentar} testID="reintentar" />
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
    paddingBottom: 40,
    backgroundColor: color.espuma,
  },
  aro: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color['marea-fondo'],
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
