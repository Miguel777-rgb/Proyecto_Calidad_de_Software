import { textos } from '@ola/compartido/i18n/textos'
import { Pantalla } from '../../componentes/pantalla/Pantalla'
import { Provisional } from '../../componentes/pantalla/Provisional'

/** Histórico por zona (RF-05). Llega en la fase 5. */
export default function Historico() {
  return (
    <Pantalla titulo={textos.graficos.historico}>
      <Provisional texto={textos.movil.provisional.historico} fase={5} />
    </Pantalla>
  )
}
