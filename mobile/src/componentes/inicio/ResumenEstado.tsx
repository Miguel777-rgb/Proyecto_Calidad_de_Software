import type { EstadoZona } from '@ola/compartido/api'
import {
  ESTADOS,
  conteoPorEstado,
  diasDesde,
  fechaCorta,
  unirNombres,
} from '@ola/compartido/inicio/datos'
import { textos } from '@ola/compartido/i18n/textos'
import { TINTES } from '@ola/compartido/mapa/paleta'
import { CircleCheck, Clock, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { color, fuente, medida, tamano } from '../../tema'
import { SimboloEstado } from '../estado/Estado'
import { Texto } from '../Texto'

interface Props {
  referencia: string
  zonas: EstadoZona[]
  hoy: Date
  vigenciaDias: number
}

/**
 * Resumen de Inicio, el mismo de la web apilado para el celular: fecha del
 * ultimo dato y su antiguedad, zonas en alerta con nombre y conteo por
 * estado. La SRS exige mostrar siempre la fecha del dato y avisar cuando no
 * corresponde al dia (Confiabilidad).
 */
export function ResumenEstado({ referencia, zonas, hoy, vigenciaDias }: Props) {
  const dias = diasDesde(referencia, hoy)
  const atrasado = dias > vigenciaDias
  const enAlerta = zonas.flatMap((z) => (z.open_alert === null ? [] : [{ zona: z, alerta: z.open_alert }]))
  const conteo = conteoPorEstado(zonas)

  return (
    <View style={estilos.resumen}>
      <View style={estilos.bloque} testID="fecha-referencia">
        <Texto style={estilos.etiqueta}>{textos.estado.ultimoDatoImarpe}</Texto>
        <View style={estilos.fila}>
          <Texto style={estilos.fecha}>{fechaCorta(referencia)}</Texto>
          <View
            testID="antiguedad-dato"
            style={[estilos.antiguedad, atrasado ? estilos.atrasado : estilos.alDia]}
          >
            <Clock size={15} color={color.abisal} aria-hidden />
            <Texto style={estilos.antiguedadTexto}>{textos.estado.antiguedad(dias)}</Texto>
          </View>
        </View>
      </View>

      <View style={[estilos.bloque, estilos.separado]}>
        <Texto style={estilos.etiqueta}>{textos.estado.etiquetaAlertas}</Texto>
        {enAlerta.length === 0 ? (
          <View style={estilos.linea} testID="resumen-alertas">
            <CircleCheck size={20} color={color.marea} aria-hidden />
            <Texto style={[estilos.lineaTexto, estilos.tenue]}>{textos.estado.ningunaAlerta}</Texto>
          </View>
        ) : (
          <View style={estilos.linea} testID="resumen-alertas">
            <TriangleAlert size={20} color={color.alerta} aria-hidden />
            <Texto style={[estilos.lineaTexto, estilos.fuerte]}>
              {textos.estado.zonasEnAlerta(
                enAlerta.length,
                unirNombres(
                  enAlerta.map(
                    ({ zona, alerta }) =>
                      `${zona.laboratory.name} (${textos.estado.singular[alerta.state]})`,
                  ),
                ),
              )}
            </Texto>
          </View>
        )}
      </View>

      <View style={[estilos.bloque, estilos.separado]}>
        <Texto style={estilos.etiqueta}>{textos.estado.etiquetaConteo}</Texto>
        {/* Tambien los estados sin zonas: la referencia de color y simbolo no
            debe desaparecer segun el dia. */}
        <View style={estilos.conteo}>
          {ESTADOS.map((estado) => {
            const nombre =
              conteo[estado] === 1 ? textos.estado.singular[estado] : textos.estado.plural[estado]
            return (
              <View
                key={estado}
                testID={`conteo-${estado}`}
                accessible
                accessibilityLabel={`${conteo[estado]} ${nombre}`}
                style={[estilos.chip, { backgroundColor: TINTES[estado] }]}
              >
                <SimboloEstado estado={estado} />
                <Texto style={estilos.chipTexto}>
                  <Texto style={estilos.cifra}>{conteo[estado]}</Texto> {nombre}
                </Texto>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  resumen: {
    borderRadius: medida.radioTarjeta,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.blanco,
  },
  bloque: { gap: 6, paddingHorizontal: 14, paddingVertical: 12 },
  separado: { borderTopWidth: 1, borderTopColor: color.borde },
  etiqueta: {
    fontSize: tamano.etiqueta,
    lineHeight: tamano.etiqueta * 1.4,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: color['tinta-tenue'],
  },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  fecha: {
    fontFamily: fuente.datos,
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  antiguedad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 2,
    paddingLeft: 6,
    paddingRight: 10,
  },
  alDia: { borderColor: color.borde, backgroundColor: color['marea-fondo'] },
  atrasado: { borderColor: color['atencion-borde'], backgroundColor: color['atencion-fondo'] },
  antiguedadTexto: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  linea: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lineaTexto: { flex: 1, fontSize: tamano.secundario, lineHeight: tamano.secundario * 1.4 },
  fuerte: { fontWeight: '600' },
  tenue: { fontWeight: '500', color: color['tinta-tenue'] },
  conteo: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 3,
    paddingLeft: 4,
    paddingRight: 11,
  },
  chipTexto: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  cifra: { fontFamily: fuente.datos, fontWeight: '600' },
})
