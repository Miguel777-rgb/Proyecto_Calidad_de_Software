import { textos } from '@ola/compartido/i18n/textos'
import { Pantalla } from '../../componentes/pantalla/Pantalla'
import { Provisional } from '../../componentes/pantalla/Provisional'

/** Comparación entre zonas (RF-06). Llega en la fase 5. */
export default function Comparar() {
  return (
    <Pantalla titulo={textos.graficos.comparacion}>
      <Provisional texto={textos.movil.provisional.comparacion} fase={5} />
    </Pantalla>
  )
}
