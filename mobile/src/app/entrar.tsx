import { textos } from '@ola/compartido/i18n/textos'
import { Pantalla } from '../componentes/pantalla/Pantalla'
import { Provisional } from '../componentes/pantalla/Provisional'

/** Iniciar sesión (RF-07). Llega en la fase 3. */
export default function Entrar() {
  return (
    <Pantalla>
      <Provisional texto={textos.movil.provisional.entrar} fase={3} />
    </Pantalla>
  )
}
