import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { obtenerConfiguracion, obtenerEstado, type EstadoSistema } from '../api/client'
import { TablaEstado } from '../components/TablaEstado'
import { ErrorCarga, EsqueletoInicio, SinDatosCargados } from '../components/inicio/EstadosCarga'
import { ResumenEstado } from '../components/inicio/ResumenEstado'
import { TarjetasZonas } from '../components/inicio/TarjetasZonas'
import { ordenarZonas } from '../components/inicio/datos'
import { MapaZonas } from '../components/mapa/MapaZonas'
import { PanelZona } from '../components/mapa/PanelZona'
import { ESCRITORIO, useMediaQuery } from '../hooks/useMediaQuery'
import { textos } from '../i18n/textos'

// Vigencia por defecto de la SRS si la configuracion no llega.
const VIGENCIA_POR_DEFECTO = 7

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error' }
  | { fase: 'lista'; estado: EstadoSistema; ventana: number | null; vigencia: number }

// La columna minmax(0, 1fr) deja que los hijos se estrechen por debajo del
// ancho de su contenido. Sin ella, la tabla abierta en celular ensanchaba toda
// la pagina en lugar de desplazarse dentro de su propio contenedor.
const ENVOLTURA = 'grid grid-cols-[minmax(0,1fr)] gap-5 text-[17px] lg:gap-6 lg:text-base'

function Titulo() {
  return (
    <h2 className="m-0 font-titulo text-[26px] leading-tight font-bold tracking-[-0.02em] text-balance lg:text-[32px]">
      {textos.estado.titulo}
    </h2>
  )
}

export default function Inicio() {
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' })
  const [intento, setIntento] = useState(0)
  const [seleccionada, setSeleccionada] = useState<string | null>(null)
  const escritorio = useMediaQuery(ESCRITORIO)
  const idTabla = useId()

  useEffect(() => {
    let vigente = true
    setCarga({ fase: 'cargando' })
    Promise.all([obtenerEstado(), obtenerConfiguracion().catch(() => null)])
      .then(([estado, config]) => {
        if (!vigente) return
        setCarga({
          fase: 'lista',
          estado,
          ventana: config?.map_window_days ?? null,
          vigencia: config?.freshness_days ?? VIGENCIA_POR_DEFECTO,
        })
      })
      .catch(() => vigente && setCarga({ fase: 'error' }))
    return () => {
      vigente = false
    }
  }, [intento])

  const zonas = useMemo(
    () => (carga.fase === 'lista' ? ordenarZonas(carga.estado.zones) : []),
    [carga],
  )

  if (carga.fase === 'cargando') {
    return (
      <section className={ENVOLTURA}>
        <Titulo />
        <EsqueletoInicio />
      </section>
    )
  }

  if (carga.fase === 'error') {
    return (
      <section className={ENVOLTURA}>
        <Titulo />
        <ErrorCarga alReintentar={() => setIntento((n) => n + 1)} />
      </section>
    )
  }

  const { estado, ventana, vigencia } = carga

  if (estado.reference_date === null) {
    return (
      <section className={ENVOLTURA}>
        <Titulo />
        <SinDatosCargados />
      </section>
    )
  }

  const zonaActiva = zonas.find((z) => z.laboratory.code === seleccionada) ?? null

  // Desde la lista, tocar de nuevo la zona elegida la deselecciona. En celular
  // el detalle queda arriba, junto al mapa: se lleva a la vista.
  function elegirDesdeLista(code: string) {
    const nueva = seleccionada === code ? null : code
    setSeleccionada(nueva)
    if (nueva === null || escritorio) return
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    document
      .querySelector('[data-testid="panel-zona"]')
      ?.scrollIntoView?.({ behavior: reducido ? 'auto' : 'smooth', block: 'center' })
  }

  const tabla = (
    <TablaEstado
      zonas={zonas}
      ventana={ventana}
      seleccionada={seleccionada}
      alSeleccionar={elegirDesdeLista}
    />
  )

  return (
    <section className={ENVOLTURA}>
      <Titulo />
      <ResumenEstado
        referencia={estado.reference_date}
        zonas={estado.zones}
        hoy={new Date()}
        vigenciaDias={vigencia}
      />

      <div className="mapa-y-panel my-0">
        <MapaZonas zonas={estado.zones} seleccionada={seleccionada} alSeleccionar={setSeleccionada} />
        <PanelZona zona={zonaActiva} alCerrar={() => setSeleccionada(null)} />
      </div>
      <p className="tenue m-0">{textos.mapa.atribucionMapa}</p>

      {/* Tarjetas y tabla nunca conviven: duplicarian lo que lee un lector de
          pantalla. En escritorio la tabla es la vista principal. */}
      {escritorio ? (
        <section aria-labelledby={idTabla} className="grid gap-2.5">
          <h3 id={idTabla} className="m-0 font-titulo text-xl font-semibold">
            {textos.estado.todasLasZonas}
          </h3>
          <div className="overflow-hidden rounded-[14px] border border-borde">{tabla}</div>
        </section>
      ) : (
        <>
          <TarjetasZonas zonas={zonas} seleccionada={seleccionada} alSeleccionar={elegirDesdeLista} />
          <details className="group m-0 rounded-[14px] border border-borde bg-blanco">
            <summary className="flex min-h-[50px] cursor-pointer list-none items-center justify-between gap-2.5 rounded-[14px] px-4 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marea [&::-webkit-details-marker]:hidden">
              {textos.estado.verTodosLosDatos}
              <ChevronDown
                aria-hidden="true"
                className="size-5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="border-t border-borde">{tabla}</div>
          </details>
        </>
      )}

      {ventana !== null && <p className="tenue m-0">{textos.estado.explicacionPromedio(ventana)}</p>}
    </section>
  )
}
