package pe.ola.autocompletado

import android.view.autofill.AutofillManager
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Cancela la sesion de autocompletado de Android que abre un campo al recibir
 * el foco.
 *
 * Desde Android 14 el sistema pide autocompletar tambien los campos que la app
 * marca como no importantes (`trigger_fill_request_on_unimportant_view`), asi
 * que `autoComplete="off"` ya no alcanza: al salir del formulario, el servicio
 * del celular (Samsung Pass, Google) ofrece guardar la contrasena, y su ventana
 * tapa la app. Sin sesion abierta no hay nada que guardar (D-32).
 */
class AutocompletadoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OlaAutocompletado")

    AsyncFunction("cancelar") {
      appContext.currentActivity?.getSystemService(AutofillManager::class.java)?.cancel()
    }.runOnQueue(Queues.MAIN)
  }
}
