import { textos } from '@ola/compartido/i18n/textos'
import { Pantalla } from '../../componentes/pantalla/Pantalla'
import { Provisional } from '../../componentes/pantalla/Provisional'

/** Próximos días (RF-02). Llega en la fase 5. */
export default function Proyeccion() {
  return (
    <Pantalla titulo={textos.proyeccion.titulo}>
      <Provisional texto={textos.movil.provisional.proyeccion} fase={5} />
    </Pantalla>
  )
}
