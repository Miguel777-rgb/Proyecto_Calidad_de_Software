import { Bell, Check, ChartLine, CircleCheck, Clock, LogIn, TriangleAlert, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { EstadoZona } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { textos } from '../../i18n/textos'
import { InsigniaEstado } from '../inicio/Estado'
import { fechaCorta, gradosConSigno } from '../inicio/datos'
import { TINTES } from './paleta'
import { useSuscripcionZona } from './useSuscripcionZona'

const FOCO = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marea'
const BOTON = `flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 font-cuerpo text-base font-semibold no-underline disabled:cursor-progress disabled:opacity-60 ${FOCO}`
const BOTON_PRIMARIO = `${BOTON} border-0 bg-abisal text-espuma hover:bg-abisal-2`
const BOTON_SECUNDARIO = `${BOTON} border border-abisal bg-blanco text-abisal hover:bg-realce`

function AvisosZona({ code, nombre }: { code: string; nombre: string }) {
  const { usuario } = useAuth()
  const { estado, ocupado, error, suscribir, dejar } = useSuscripcionZona(code)

  if (usuario === null) {
    // Tras entrar se vuelve a Inicio con la zona abierta: un toque mas y listo.
    return (
      <Link
        to="/entrar"
        state={{ desde: `/?zona=${encodeURIComponent(code)}` }}
        className={BOTON_SECUNDARIO}
      >
        <LogIn aria-hidden="true" className="size-5" />
        {textos.mapa.entraParaAvisos}
      </Link>
    )
  }

  if (estado === 'cargando') {
    return (
      <p role="status" className="m-0 text-sm text-tinta-tenue">
        {textos.comun.cargando}
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      {/* Anuncia el cambio a lectores de pantalla al suscribirse o darse de baja. */}
      <div aria-live="polite">
        {estado === 'suscrito' ? (
          <div
            data-testid="avisos-zona"
            className="flex min-h-12 flex-wrap items-center justify-between gap-2.5 rounded-xl bg-marea-fondo py-1.5 pr-1.5 pl-3 font-semibold"
          >
            <span className="inline-flex items-center gap-2">
              <Check aria-hidden="true" className="size-5 text-marea" />
              {textos.mapa.recibesAvisos(nombre)}
            </span>
            <button
              type="button"
              disabled={ocupado}
              onClick={dejar}
              className={`min-h-10 cursor-pointer rounded-[10px] border border-marea bg-blanco px-3 font-cuerpo text-sm font-semibold text-marea hover:bg-realce disabled:cursor-progress disabled:opacity-60 ${FOCO}`}
            >
              {textos.mapa.dejarDeRecibir}
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="avisos-zona"
            disabled={ocupado}
            onClick={suscribir}
            className={BOTON_PRIMARIO}
          >
            <Bell aria-hidden="true" className="size-5" />
            {textos.mapa.recibirAvisos(nombre)}
          </button>
        )}
      </div>
      {error !== null && (
        <p className="error m-0" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface Props {
  zona: EstadoZona
  /** Dias que promedia el mapa; null si la configuracion no llego. */
  ventana: number | null
  alCerrar: () => void
}

/** Detalle de una zona: el mismo en la hoja inferior y en el panel lateral. */
export function DetalleZona({ zona, ventana, alCerrar }: Props) {
  const code = zona.laboratory.code
  const nombre = zona.laboratory.name
  const alerta = zona.open_alert

  return (
    <div className="grid gap-3 text-abisal" data-testid="detalle-zona">
      <div className="flex items-start justify-between gap-3">
        <div className="grid justify-items-start gap-2">
          <h3 className="m-0 font-titulo text-2xl leading-tight font-bold tracking-[-0.01em]">
            {nombre}
          </h3>
          <InsigniaEstado estado={zona.state} testId="panel-situacion" />
        </div>
        <button
          type="button"
          onClick={alCerrar}
          aria-label={textos.mapa.cerrarPanel}
          className={`-mt-2 -mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-abisal hover:bg-realce ${FOCO}`}
        >
          <X aria-hidden="true" className="size-6" />
        </button>
      </div>

      {zona.is_stale ? (
        <p
          data-testid="panel-obsoleta"
          className="m-0 flex items-start gap-2 rounded-xl border border-atencion-borde bg-atencion-fondo px-3 py-2.5 text-[15px]"
        >
          <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-tinta-tenue" />
          {textos.mapa.avisoObsoleta(
            zona.last_measured_on === null ? null : fechaCorta(zona.last_measured_on),
          )}
        </p>
      ) : (
        <>
          {zona.average_c !== null && (
            <div>
              <p className="m-0">
                <strong
                  data-testid="panel-promedio"
                  className="mr-1.5 font-datos text-[22px] font-semibold tabular-nums"
                >
                  {gradosConSigno(zona.average_c)}
                </strong>{' '}
                {textos.estado.respectoNormal[zona.state]}
              </p>
              <p className="m-0 mt-0.5 text-[13.5px] text-tinta-tenue">
                {textos.mapa.promedioDeDias(ventana)}
              </p>
            </div>
          )}

          {zona.last_measured_on !== null && zona.last_anomaly_c !== null && (
            <p data-testid="panel-ultima-medicion" className="m-0 text-[15px]">
              {textos.mapa.valorMedido(fechaCorta(zona.last_measured_on))}{' '}
              <b className="font-datos font-semibold tabular-nums">
                {gradosConSigno(zona.last_anomaly_c)}
              </b>
            </p>
          )}

          {alerta !== null ? (
            <div
              data-testid="panel-alerta"
              className="grid gap-0.5 rounded-xl px-3 py-2.5"
              style={{ background: TINTES[alerta.state] }}
            >
              <p className="m-0 flex items-start gap-2 font-bold">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-alerta" />
                {textos.mapa.enAlerta(
                  textos.estado.singular[alerta.state],
                  fechaCorta(alerta.started_on),
                )}
              </p>
              <p className="m-0 pl-7 text-[14.5px]">
                {textos.mapa.detalleAlerta(
                  alerta.streak_length,
                  gradosConSigno(alerta.peak_anomaly_c),
                )}
              </p>
            </div>
          ) : (
            <p
              data-testid="panel-sin-alerta"
              className="m-0 flex items-start gap-2 text-[15px] text-tinta-tenue"
            >
              <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-marea" />
              {textos.mapa.sinAlertaExplicacion}
            </p>
          )}
        </>
      )}

      <div className="mt-1 grid gap-2">
        {/* Una zona que ya no mide no genera alertas: no se ofrece suscribirse. */}
        {!zona.is_stale && <AvisosZona code={code} nombre={nombre} />}
        <Link to={`/historico?zona=${encodeURIComponent(code)}`} className={BOTON_SECUNDARIO}>
          <ChartLine aria-hidden="true" className="size-5" />
          {textos.mapa.verHistorico(nombre)}
        </Link>
      </div>
    </div>
  )
}
