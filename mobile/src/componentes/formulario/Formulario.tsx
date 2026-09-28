import type { ReactNode } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, medida } from '../../tema'

/**
 * Pantalla de formulario: se desplaza y deja sitio al teclado, para que el
 * boton principal siga a la vista con el teclado abierto y con letra grande.
 */
export function Formulario({ children, testID }: { children: ReactNode; testID?: string }) {
  const { bottom } = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView style={estilos.fondo} behavior="padding">
      <ScrollView
        testID={testID}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + 24 }]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.espuma },
  contenido: { gap: 16, paddingHorizontal: medida.margen, paddingTop: 24 },
})
