import { textos } from '@ola/compartido/i18n/textos'
import { Pantalla } from '../componentes/pantalla/Pantalla'
import { Provisional } from '../componentes/pantalla/Provisional'

/** Centro de avisos (RF-03). Llega en la fase 4. */
export default function Avisos() {
  return (
    <Pantalla>
      <Provisional texto={textos.movil.provisional.avisos} fase={4} />
    </Pantalla>
  )
}
