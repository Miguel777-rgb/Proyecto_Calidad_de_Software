import type { EstadoZona } from '@ola/compartido/api'
import { fechaCorta, gradosConSigno } from '@ola/compartido/inicio/datos'
import { textos } from '@ola/compartido/i18n/textos'
import { TINTES } from '@ola/compartido/mapa/paleta'
import { ChartLine, CircleCheck, Clock, LogIn, TriangleAlert, X } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { color, fuente, medida } from '../../tema'
import { InsigniaEstado } from '../estado/Estado'
import { Texto } from '../Texto'

interface Props {
  zona: EstadoZona
  /** Dias que promedia el mapa; null si la configuracion no llego. */
  ventana: number | null
  alCerrar: () => void
  alEntrar: () => void
  alVerHistorico: () => void
}

function Accion({
  texto,
  icono,
  alPulsar,
  testID,
}: {
  texto: string
  icono: ReactNode
  alPulsar: () => void
  testID: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={alPulsar}
      style={({ pressed }) => [estilos.accion, pressed && estilos.accionPulsada]}
    >
      {icono}
      <Texto style={estilos.accionTexto}>{texto}</Texto>
    </Pressable>
  )
}

/**
 * Detalle de una zona, con el mismo contenido que la web. «Recibir avisos»
 * lleva a Entrar hasta que la app tenga sesion (fase 3); una zona que ya no
 * mide no genera alertas, asi que no lo ofrece.
 */
export function DetalleZona({ zona, ventana, alCerrar, alEntrar, alVerHistorico }: Props) {
  const nombre = zona.laboratory.name
  const alerta = zona.open_alert

  return (
    <View style={estilos.detalle} testID="detalle-zona">
      <View style={estilos.cabeza}>
        <View style={estilos.identidad}>
          <Texto accessibilityRole="header" style={estilos.nombre}>
            {nombre}
          </Texto>
          <InsigniaEstado estado={zona.state} testID="detalle-situacion" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={textos.mapa.cerrarPanel}
          testID="cerrar-detalle"
          onPress={alCerrar}
          hitSlop={4}
          style={({ pressed }) => [estilos.cerrar, pressed && estilos.cerrarPulsado]}
        >
          <X size={24} color={color.abisal} aria-hidden />
        </Pressable>
      </View>

      {zona.is_stale ? (
        <View style={estilos.obsoleta} testID="detalle-obsoleta">
          <Clock size={20} color={color['tinta-tenue']} aria-hidden />
          <Texto style={estilos.filaTexto}>
            {textos.mapa.avisoObsoleta(
              zona.last_measured_on === null ? null : fechaCorta(zona.last_measured_on),
            )}
          </Texto>
        </View>
      ) : (
        <>
          {zona.average_c !== null && (
            <View>
              <Texto testID="detalle-promedio">
                <Texto style={estilos.valor}>{gradosConSigno(zona.average_c)}</Texto>{' '}
                {textos.estado.respectoNormal[zona.state]}
              </Texto>
              <Texto style={estilos.nota}>{textos.mapa.promedioDeDias(ventana)}</Texto>
            </View>
          )}
          {zona.last_measured_on !== null && zona.last_anomaly_c !== null && (
            <Texto style={estilos.medido} testID="detalle-ultima-medicion">
              {textos.mapa.valorMedido(fechaCorta(zona.last_measured_on))}{' '}
              <Texto style={estilos.cifra}>{gradosConSigno(zona.last_anomaly_c)}</Texto>
            </Texto>
          )}
          {alerta !== null ? (
            <View
              style={[estilos.alerta, { backgroundColor: TINTES[alerta.state] }]}
              testID="detalle-alerta"
            >
              <View style={estilos.fila}>
                <TriangleAlert size={20} color={color.alerta} aria-hidden />
                <Texto style={[estilos.filaTexto, estilos.fuerte]}>
                  {textos.mapa.enAlerta(
                    textos.estado.singular[alerta.state],
                    fechaCorta(alerta.started_on),
                  )}
                </Texto>
              </View>
              <Texto style={estilos.alertaDetalle}>
                {textos.mapa.detalleAlerta(
                  alerta.streak_length,
                  gradosConSigno(alerta.peak_anomaly_c),
                )}
              </Texto>
            </View>
          ) : (
            <View style={estilos.fila} testID="detalle-sin-alerta">
              <CircleCheck size={20} color={color.marea} aria-hidden />
              <Texto style={[estilos.filaTexto, estilos.tenue]}>
                {textos.mapa.sinAlertaExplicacion}
              </Texto>
            </View>
          )}
        </>
      )}

      <View style={estilos.acciones}>
        {!zona.is_stale && (
          <Accion
            testID="entrar-para-avisos"
            texto={textos.mapa.entraParaAvisos}
            icono={<LogIn size={20} color={color.abisal} aria-hidden />}
            alPulsar={alEntrar}
          />
        )}
        <Accion
          testID="ver-historico"
          texto={textos.mapa.verHistorico(nombre)}
          icono={<ChartLine size={20} color={color.abisal} aria-hidden />}
          alPulsar={alVerHistorico}
        />
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  detalle: { gap: 12 },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  identidad: { flexShrink: 1, gap: 8 },
  nombre: {
    fontFamily: fuente.titulo,
    fontWeight: '700',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  cerrar: {
    width: 44,
    height: 44,
    marginTop: -6,
    marginRight: -8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarPulsado: { backgroundColor: color.realce },
  valor: {
    fontFamily: fuente.datos,
    fontWeight: '600',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  nota: { marginTop: 2, fontSize: 13.5, lineHeight: 19, color: color['tinta-tenue'] },
  medido: { fontSize: 15, lineHeight: 21 },
  cifra: { fontFamily: fuente.datos, fontWeight: '600', fontVariant: ['tabular-nums'] },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  filaTexto: { flex: 1, fontSize: 15, lineHeight: 21 },
  fuerte: { fontWeight: '700' },
  tenue: { color: color['tinta-tenue'] },
  alerta: { gap: 2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  alertaDetalle: { paddingLeft: 28, fontSize: 14.5, lineHeight: 20 },
  obsoleta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color['atencion-borde'],
    backgroundColor: color['atencion-fondo'],
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  acciones: { gap: 8, marginTop: 4 },
  accion: {
    minHeight: medida.toque + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.abisal,
    backgroundColor: color.blanco,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  accionPulsada: { backgroundColor: color.realce },
  accionTexto: { flexShrink: 1, fontWeight: '600', textAlign: 'center' },
})
