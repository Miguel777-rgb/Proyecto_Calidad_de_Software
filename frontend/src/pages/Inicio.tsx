import { useEffect, useState } from 'react'
import { obtenerConfiguracion, obtenerEstado, type EstadoSistema } from '../api/client'
import { BannerActualizacion } from '../components/BannerActualizacion'
import { LeyendaEstados } from '../components/LeyendaEstados'
import { TablaEstado } from '../components/TablaEstado'
import { textos } from '../i18n/textos'

export default function Inicio() {
  const [estado, setEstado] = useState<EstadoSistema | null>(null)
  const [ventana, setVentana] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)

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

  if (cargando) return <p role="status">{textos.comun.cargando}</p>
  if (estado === null) return <p role="alert">{textos.conexion.error}</p>

  const sinDatos = estado.reference_date === null

  return (
    <section>
      <h2>{textos.estado.titulo}</h2>
      <BannerActualizacion fecha={estado.reference_date} />

      {sinDatos ? (
        <p className="aviso" data-testid="sin-datos">
          {textos.estado.sinDatosCargados}
        </p>
      ) : (
        <>
          <LeyendaEstados />
          <TablaEstado zonas={estado.zones} />
          {ventana !== null && (
            <p className="tenue">{textos.estado.explicacionPromedio(ventana)}</p>
          )}
        </>
      )}
    </section>
  )
}
