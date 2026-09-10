import { useEffect, useMemo, useState } from 'react'
import { obtenerConfiguracion, obtenerEstado, type EstadoSistema } from '../api/client'
import { BannerActualizacion } from '../components/BannerActualizacion'
import { LeyendaEstados } from '../components/LeyendaEstados'
import { TablaEstado } from '../components/TablaEstado'
import { MapaZonas } from '../components/mapa/MapaZonas'
import { PanelZona } from '../components/mapa/PanelZona'
import { textos } from '../i18n/textos'

export default function Inicio() {
  const [estado, setEstado] = useState<EstadoSistema | null>(null)
  const [ventana, setVentana] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [seleccionada, setSeleccionada] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    Promise.all([obtenerEstado(), obtenerConfiguracion().catch(() => null)])
      .then(([datos, config]) => {
        if (!vigente) return
        setEstado(datos)
        setVentana(config?.map_window_days ?? null)
      })
      .catch(() => vigente && setEstado(null))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [])

  const zonaActiva = useMemo(
    () => estado?.zones.find((z) => z.laboratory.code === seleccionada) ?? null,
    [estado, seleccionada],
  )

  if (cargando) return <p role="status">{textos.comun.cargando}</p>
  if (estado === null) return <p role="alert">{textos.conexion.error}</p>

  if (estado.reference_date === null) {
    return (
      <section>
        <h2>{textos.estado.titulo}</h2>
        <p className="aviso" data-testid="sin-datos">
          {textos.estado.sinDatosCargados}
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2>{textos.estado.titulo}</h2>
      <BannerActualizacion fecha={estado.reference_date} />
      <LeyendaEstados />

      <div className="mapa-y-panel">
        <MapaZonas
          zonas={estado.zones}
          seleccionada={seleccionada}
          alSeleccionar={setSeleccionada}
        />
        <PanelZona zona={zonaActiva} alCerrar={() => setSeleccionada(null)} />
      </div>

      <p className="tenue">{textos.mapa.atribucionMapa}</p>

      {/* La tabla es la alternativa accesible al mapa: funciona con lector de
          pantalla, con teclado y en pantallas pequenas. */}
      <h3>{textos.mapa.verTabla}</h3>
      <TablaEstado zonas={estado.zones} />

      {ventana !== null && <p className="tenue">{textos.estado.explicacionPromedio(ventana)}</p>}
    </section>
  )
}
