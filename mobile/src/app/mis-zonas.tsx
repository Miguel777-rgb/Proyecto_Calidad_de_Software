import { textos } from '@ola/compartido/i18n/textos'
import { Pantalla } from '../componentes/pantalla/Pantalla'
import { Provisional } from '../componentes/pantalla/Provisional'

/** Zonas de interés (RF-07). Llega en la fase 3. */
export default function MisZonas() {
  return (
    <Pantalla>
      <Provisional texto={textos.movil.provisional.misZonas} fase={3} />
    </Pantalla>
  )
}
