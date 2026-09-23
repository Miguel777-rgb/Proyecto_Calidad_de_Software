import { textos } from '@ola/compartido/i18n/textos'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ProveedorSesion } from '../sesion'
import { color, fuente } from '../tema'

// expo-router usa este componente si una pantalla falla al dibujarse.
export { ErrorInesperado as ErrorBoundary } from '../componentes/pantalla/ErrorInesperado'

/** Pantallas fuera de las pestanas: llevan la barra nativa con «atras». */
const CABECERA = {
  headerShown: true,
  headerStyle: { backgroundColor: color.abisal },
  headerTintColor: color.espuma,
  headerTitleStyle: { fontFamily: fuente.titulo, fontWeight: '600' as const },
}

export default function Raiz() {
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        {/* Iconos claros: la banda abisal pinta la zona de la hora. */}
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.espuma },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="entrar" options={{ ...CABECERA, title: textos.entrar.titulo }} />
          <Stack.Screen
            name="mis-zonas"
            options={{ ...CABECERA, title: textos.suscripciones.titulo }}
          />
          <Stack.Screen name="avisos" options={{ ...CABECERA, title: textos.avisos.titulo }} />
        </Stack>
      </ProveedorSesion>
    </SafeAreaProvider>
  )
}
