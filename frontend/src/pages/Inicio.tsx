import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { obtenerConfiguracion, obtenerEstado, type EstadoSistema } from '../api/client'
import { TablaEstado } from '../components/TablaEstado'
import { ErrorCarga, EsqueletoInicio, SinDatosCargados } from '../components/inicio/EstadosCarga'
import { ResumenEstado } from '../components/inicio/ResumenEstado'
import { TituloInicio } from '../components/inicio/TituloInicio'
import { ENVOLTURA_INICIO } from '../components/inicio/estructura'
import { TarjetasZonas } from '../components/inicio/TarjetasZonas'
import { ordenarZonas } from '../components/inicio/datos'
import { DetalleZona } from '../components/mapa/DetalleZona'
import { HojaInferior } from '../components/mapa/HojaInferior'
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

export default function Inicio() {
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' })
  const [intento, setIntento] = useState(0)
  const [parametros, setParametros] = useSearchParams()
  const escritorio = useMediaQuery(ESCRITORIO)
  const idTabla = useId()

  // La zona elegida vive en la direccion (/?zona=CALLAO): sobrevive a una
  // recarga y permite volver a ella despues de iniciar sesion.
  const seleccionada = parametros.get('zona')

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
      <section className={ENVOLTURA_INICIO}>
        <TituloInicio />
        <EsqueletoInicio />
      </section>
    )
  }

  if (carga.fase === 'error') {
    return (
      <section className={ENVOLTURA_INICIO}>
        <TituloInicio />
        <ErrorCarga alReintentar={() => setIntento((n) => n + 1)} />
      </section>
    )
  }

  const { estado, ventana, vigencia } = carga

  if (estado.reference_date === null) {
    return (
      <section className={ENVOLTURA_INICIO}>
        <TituloInicio />
        <SinDatosCargados />
      </section>
    )
  }

  const zonaActiva = zonas.find((z) => z.laboratory.code === seleccionada) ?? null

  function seleccionar(code: string | null) {
    setParametros(code === null ? {} : { zona: code }, { replace: true })
  }

  // Desde la lista, tocar de nuevo la zona elegida la deselecciona.
  function alternar(code: string) {
    seleccionar(seleccionada === code ? null : code)
  }

  const cerrar = () => seleccionar(null)

  const tabla = (
    <TablaEstado zonas={zonas} ventana={ventana} seleccionada={seleccionada} alSeleccionar={alternar} />
  )

  return (
    <section className={ENVOLTURA_INICIO}>
      <TituloInicio />
      <ResumenEstado
        referencia={estado.reference_date}
        zonas={estado.zones}
        hoy={new Date()}
        vigenciaDias={vigencia}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)] lg:items-start lg:gap-4">
        <MapaZonas
          zonas={estado.zones}
          seleccionada={seleccionada}
          alSeleccionar={seleccionar}
          conEtiquetas={escritorio}
        />
        {escritorio && (
          <PanelZona
            zona={zonaActiva}
            zonas={zonas}
            ventana={ventana}
            alSeleccionar={seleccionar}
            alCerrar={cerrar}
          />
        )}
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
          <TarjetasZonas zonas={zonas} seleccionada={seleccionada} alSeleccionar={alternar} />
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

      {!escritorio && (
        <HojaInferior
          abierta={zonaActiva !== null}
          etiqueta={zonaActiva === null ? '' : textos.mapa.detalleDe(zonaActiva.laboratory.name)}
          alCerrar={cerrar}
        >
          {zonaActiva !== null && (
            <DetalleZona zona={zonaActiva} ventana={ventana} alCerrar={cerrar} />
          )}
        </HojaInferior>
      )}
    </section>
  )
}
