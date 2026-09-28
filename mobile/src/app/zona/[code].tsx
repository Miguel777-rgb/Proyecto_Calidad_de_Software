import { textos } from '@ola/compartido/i18n/textos'
import { router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Boton } from '../../componentes/pantalla/Boton'
import { Texto } from '../../componentes/Texto'
import { DetalleZona } from '../../componentes/zona/DetalleZona'
import { useEstadoMar } from '../../estado/EstadoMar'
import { color } from '../../tema'

function cerrar() {
  // Desde una notificacion (fase 4) la hoja puede ser lo primero que se abre.
  if (router.canGoBack()) router.back()
  else router.replace('/')
}

/**
 * Detalle de una zona, presentado como hoja (ver app/_layout.tsx). Es una
 * ruta para que tocar una notificacion push pueda abrir directamente
 * /zona/CALLAO. Lee el mismo estado que la pestana Mapa.
 */
export default function Zona() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const { estadoMar } = useEstadoMar()
  const { bottom } = useSafeAreaInsets()

  if (estadoMar.fase === 'cargando') {
    return (
      <View style={estilos.centro} testID="cargando">
        <ActivityIndicator color={color.marea} accessibilityLabel={textos.estado.cargando} />
      </View>
    )
  }

  const zona =
    estadoMar.fase === 'lista'
      ? estadoMar.datos.estado.zones.find((z) => z.laboratory.code === code)
      : undefined

  if (zona === undefined) {
    return (
      <View style={[estilos.centro, { paddingBottom: bottom + 20 }]} testID="zona-desconocida">
        <Texto accessibilityRole="header" style={estilos.fuerte}>
          {textos.movil.zonaDesconocida}
        </Texto>
        <Boton texto={textos.movil.volverAlMapa} alPulsar={cerrar} />
      </View>
    )
  }

  const ventana = estadoMar.fase === 'lista' ? estadoMar.datos.ventana : null

  return (
    <ScrollView
      style={estilos.fondo}
      contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + 16 }]}
    >
      <DetalleZona
        zona={zona}
        ventana={ventana}
        alCerrar={cerrar}
        // Entrar reemplaza la hoja: al volver de Entrar se ve el mapa.
        alEntrar={() => router.replace('/entrar')}
        alVerHistorico={() => router.navigate('/historico')}
      />
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  fondo: { backgroundColor: color.blanco },
  contenido: { paddingHorizontal: 18, paddingTop: 20 },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: color.blanco,
  },
  fuerte: { fontWeight: '600', textAlign: 'center' },
})
