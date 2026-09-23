import { fechaCorta } from '@ola/compartido/inicio/datos'
import { textos } from '@ola/compartido/i18n/textos'
import { Calendar } from 'lucide-react-native'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { api } from '../../api'
import { ErrorConexion } from '../../componentes/pantalla/ErrorConexion'
import { Pantalla } from '../../componentes/pantalla/Pantalla'
import { Provisional } from '../../componentes/pantalla/Provisional'
import { Texto } from '../../componentes/Texto'
import { marcarHito } from '../../hitos'
import { color, fuente, tamano } from '../../tema'
import { useConsulta } from '../../useConsulta'

const pedirEstado = () => api.obtenerEstado()

/**
 * Mapa. En la fase 1 solo muestra la fecha del dato, que ya sale de la API:
 * prueba que la app llega al backend. El mapa y las zonas llegan en la fase 2.
 */
export default function Mapa() {
  const { estado, reintentar } = useConsulta(pedirEstado)

  useEffect(() => {
    if (estado.fase === 'lista') marcarHito('estado-visible')
  }, [estado.fase])

  if (estado.fase === 'error') return <ErrorConexion alReintentar={reintentar} />

  return (
    <Pantalla titulo={textos.estado.titulo}>
      {estado.fase === 'cargando' ? (
        <View style={estilos.tarjeta} accessibilityRole="progressbar" testID="cargando">
          <ActivityIndicator color={color.marea} />
          <Texto style={estilos.secundario}>{textos.estado.cargando}</Texto>
        </View>
      ) : estado.datos.reference_date === null ? (
        <View style={[estilos.tarjeta, estilos.atencion]} testID="sin-datos">
          <Texto style={estilos.fuerte}>{textos.estado.sinDatosCargados}</Texto>
          <Texto style={estilos.secundario}>{textos.estado.sinDatosCargadosAyuda}</Texto>
        </View>
      ) : (
        <View style={estilos.tarjeta} testID="fecha-referencia">
          <Calendar size={20} color={color.marea} aria-hidden />
          <Texto style={estilos.fecha}>
            {textos.movil.fechaDato}{' '}
            <Texto style={estilos.cifra}>{fechaCorta(estado.datos.reference_date)}</Texto>
          </Texto>
        </View>
      )}
      <Provisional texto={textos.movil.provisional.mapa} fase={2} />
    </Pantalla>
  )
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.blanco,
  },
  atencion: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    borderColor: color['atencion-borde'],
    backgroundColor: color['atencion-fondo'],
  },
  fecha: { flexShrink: 1, fontSize: tamano.secundario },
  cifra: { fontFamily: fuente.datos, fontWeight: '500', fontVariant: ['tabular-nums'] },
  fuerte: { fontWeight: '600' },
  secundario: { fontSize: tamano.secundario, color: color['tinta-tenue'] },
})

