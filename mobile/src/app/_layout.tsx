import { textos } from '@ola/compartido/i18n/textos'
import { router, Stack, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, type ReactNode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ProveedorEstadoMar } from '../estado/EstadoMar'
import { ProveedorSesion, useSesion } from '../sesion'
import { ProveedorZonasSeguidas } from '../suscripciones'
import { color, fuente, medida } from '../tema'

// expo-router usa este componente si una pantalla falla al dibujarse.
export { ErrorInesperado as ErrorBoundary } from '../componentes/pantalla/ErrorInesperado'

/** Pantallas fuera de las pestanas: llevan la barra nativa con «atras». */
const CABECERA = {
  headerShown: true,
  headerStyle: { backgroundColor: color.abisal },
  headerTintColor: color.espuma,
  headerTitleStyle: { fontFamily: fuente.titulo, fontWeight: '600' as const },
}

/**
 * Si la API cierra la sesion a mitad de uso, abre Entrar con el aviso y con la
 * pantalla donde estaba la persona, para volver a ella al entrar.
 */
function VigiaSesion({ children }: { children: ReactNode }) {
  const { sesionTermino } = useSesion()
  const ruta = usePathname()

  useEffect(() => {
    if (!sesionTermino || ruta === '/entrar') return
    router.push({ pathname: '/entrar', params: { motivo: 'sesion', volver: ruta } })
  }, [sesionTermino, ruta])

  return children
}

export default function Raiz() {
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <ProveedorEstadoMar>
          <ProveedorZonasSeguidas>
            <VigiaSesion>
              {/* Iconos claros: la banda abisal pinta la zona de la hora. */}
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: color.espuma },
                }}
              >
                <Stack.Screen name="(tabs)" />
                {/* Detalle de una zona: hoja nativa de Android que crece segun su
                    contenido; se cierra con «atras» o deslizando hacia abajo. */}
                <Stack.Screen
                  name="zona/[code]"
                  options={{
                    presentation: 'formSheet',
                    sheetAllowedDetents: 'fitToContents',
                    sheetGrabberVisible: true,
                    sheetCornerRadius: medida.radioHoja,
                    contentStyle: { backgroundColor: color.blanco },
                  }}
                />
                <Stack.Screen
                  name="entrar"
                  options={{ ...CABECERA, title: textos.entrar.titulo }}
                />
                <Stack.Screen
                  name="registro"
                  options={{ ...CABECERA, title: textos.registro.titulo }}
                />
                <Stack.Screen
                  name="recuperar"
                  options={{ ...CABECERA, title: textos.recuperar.titulo }}
                />
                <Stack.Screen
                  name="mis-zonas"
                  options={{ ...CABECERA, title: textos.suscripciones.titulo }}
                />
                <Stack.Screen
                  name="avisos"
                  options={{ ...CABECERA, title: textos.avisos.titulo }}
                />
              </Stack>
            </VigiaSesion>
          </ProveedorZonasSeguidas>
        </ProveedorEstadoMar>
      </ProveedorSesion>
    </SafeAreaProvider>
  )
}
