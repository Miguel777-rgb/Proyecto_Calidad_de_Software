import { requireOptionalNativeModule } from 'expo'

interface ModuloAutocompletado {
  cancelar(): Promise<void>
}

// Opcional: en Jest y en la web no existe, y ahi no hay nada que cancelar.
const modulo = requireOptionalNativeModule<ModuloAutocompletado>('OlaAutocompletado')

/**
 * Cierra la sesion de autocompletado de Android, para que el celular no
 * ofrezca guardar la contrasena de OLA. Ver `android/.../AutocompletadoModule.kt`.
 */
export function cancelarAutocompletado(): void {
  void modulo?.cancelar().catch(() => {})
}
