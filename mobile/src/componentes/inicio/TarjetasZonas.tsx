import type { EstadoZona } from '@ola/compartido/api'
import { fechaCorta, gradosConSigno } from '@ola/compartido/inicio/datos'
import { textos } from '@ola/compartido/i18n/textos'
import { TINTES } from '@ola/compartido/mapa/paleta'
import { TriangleAlert } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { color, fuente, tamano } from '../../tema'
import { InsigniaEstado } from '../estado/Estado'
import { Texto } from '../Texto'

function lineaDelDato(zona: EstadoZona): string | null {
  if (zona.last_measured_on === null) return null
  const fecha = fechaCorta(zona.last_measured_on)
  return zona.is_stale ? textos.estado.sinMedicionesDesde(fecha) : textos.estado.ultimoDato(fecha)
}

interface PropsTarjeta {
  zona: EstadoZona
  alElegir: (code: string) => void
}

/** Una zona: estado, promedio, ultimo dato y alerta. Abre su detalle. */
export function TarjetaZona({ zona, alElegir }: PropsTarjeta) {
  const code = zona.laboratory.code
  const alerta = zona.open_alert
  const dato = lineaDelDato(zona)

  return (
    <Pressable
      accessibilityRole="button"
      testID={`tarjeta-${code}`}
      onPress={() => alElegir(code)}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.pulsada]}
    >
      <View style={estilos.cabeza}>
        <Texto style={estilos.nombre}>{zona.laboratory.name}</Texto>
        <InsigniaEstado estado={zona.state} />
      </View>
      {zona.average_c !== null && (
        <Texto style={estilos.promedio}>
          <Texto style={estilos.valor}>{gradosConSigno(zona.average_c)}</Texto>{' '}
          {textos.estado.respectoNormal[zona.state]}
        </Texto>
      )}
      {dato !== null && <Texto style={estilos.dato}>{dato}</Texto>}
      {alerta !== null && (
        <View
          testID={`tarjeta-alerta-${code}`}
          style={[estilos.alerta, { backgroundColor: TINTES[alerta.state] }]}
        >
          <TriangleAlert size={18} color={color.abisal} aria-hidden />
          <Texto style={estilos.alertaTexto}>
            {textos.estado.enAlertaDesde(fechaCorta(alerta.started_on), alerta.streak_length)}
          </Texto>
        </View>
      )}
    </Pressable>
  )
}

interface Props {
  /** Ya ordenadas: alertas primero y luego de norte a sur. */
  zonas: EstadoZona[]
  alElegir: (code: string) => void
}

/** Todas las zonas: la alternativa accesible al mapa, en el mismo orden que la web. */
export function TarjetasZonas({ zonas, alElegir }: Props) {
  return (
    <View style={estilos.lista} testID="tarjetas-zonas">
      <Texto accessibilityRole="header" style={estilos.titulo}>
        {textos.estado.todasLasZonas}
      </Texto>
      {zonas.map((zona) => (
        <TarjetaZona key={zona.laboratory.code} zona={zona} alElegir={alElegir} />
      ))}
    </View>
  )
}

const estilos = StyleSheet.create({
  lista: { gap: 10 },
  titulo: {
    fontFamily: fuente.titulo,
    fontWeight: '600',
    fontSize: tamano.tituloSeccion,
    lineHeight: tamano.tituloSeccion * 1.25,
  },
  tarjeta: {
    gap: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.blanco,
    paddingVertical: 13,
    paddingLeft: 16,
    paddingRight: 14,
  },
  pulsada: { borderColor: color.marea, backgroundColor: color.realce },
  cabeza: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nombre: {
    flexShrink: 1,
    fontFamily: fuente.titulo,
    fontWeight: '600',
    fontSize: 19,
    lineHeight: 24,
  },
  promedio: { fontSize: 15.5, lineHeight: 22 },
  valor: {
    fontFamily: fuente.datos,
    fontWeight: '600',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  dato: { fontSize: 14, lineHeight: 20, color: color['tinta-tenue'] },
  alerta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  alertaTexto: { flex: 1, fontSize: 14.5, lineHeight: 20, fontWeight: '600' },
})
