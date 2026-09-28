import type { EstadoZona } from '@ola/compartido/api'
import { textos } from '@ola/compartido/i18n/textos'
import { router } from 'expo-router'
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native'
import { SimboloEstado } from '../componentes/estado/Estado'
import { Mensaje } from '../componentes/formulario/Mensaje'
import { Boton } from '../componentes/pantalla/Boton'
import { Pantalla } from '../componentes/pantalla/Pantalla'
import { Texto } from '../componentes/Texto'
import { useEstadoMar } from '../estado/EstadoMar'
import { useSesion } from '../sesion'
import { useZonasSeguidas } from '../suscripciones'
import { color, fuente, medida, tamano } from '../tema'

function situacion(zona: EstadoZona): string {
  const estado = textos.estado[zona.state]
  return zona.open_alert === null ? estado : `${estado} · ${textos.movil.enAlerta}`
}

function FilaZona({
  zona,
  seguida,
  ocupada,
  alCambiar,
}: {
  zona: EstadoZona
  seguida: boolean
  ocupada: boolean
  alCambiar: () => void
}) {
  const code = zona.laboratory.code
  const nombre = zona.laboratory.name
  return (
    <View style={estilos.fila}>
      <View style={estilos.nombre} importantForAccessibility="no-hide-descendants">
        <Texto style={estilos.nombreTexto}>{nombre}</Texto>
        <View style={estilos.situacion}>
          <SimboloEstado estado={zona.state} medida={18} />
          <Texto style={estilos.situacionTexto}>{situacion(zona)}</Texto>
        </View>
      </View>
      <Switch
        testID={`seguir-${code}`}
        accessibilityLabel={`${nombre}, ${situacion(zona).toLowerCase().replace(' · ', ', ')}`}
        value={seguida}
        disabled={ocupada}
        onValueChange={alCambiar}
        trackColor={{ false: '#c9d3d5', true: color.abisal }}
        thumbColor={seguida ? color.blanco : '#6d7e82'}
      />
    </View>
  )
}

/**
 * Mis zonas de interés (RF-07): las 10 zonas de norte a sur con su estado y un
 * interruptor para seguirlas. Tambien Matarani: avisara si vuelve a medir.
 */
export default function MisZonas() {
  const { usuario } = useSesion()
  const { estadoMar, actualizar } = useEstadoMar()
  const zonas = useZonasSeguidas()

  if (usuario === null) {
    return (
      <Pantalla>
        <Texto style={estilos.ayuda}>{textos.suscripciones.entrarPara}</Texto>
        <Boton
          texto={textos.navegacion.entrar}
          alPulsar={() => router.push({ pathname: '/entrar', params: { volver: '/mis-zonas' } })}
          testID="mis-zonas-entrar"
        />
      </Pantalla>
    )
  }

  const fallo = zonas.estado === 'error' || estadoMar.fase === 'error'

  return (
    <Pantalla>
      <Texto style={estilos.ayuda}>{textos.suscripciones.ayuda}</Texto>
      {zonas.error !== null && <Mensaje tipo="error" texto={zonas.error} testID="error-zonas" />}
      {fallo ? (
        <Boton
          texto={textos.estado.reintentar}
          alPulsar={() => {
            zonas.recargar()
            if (estadoMar.fase === 'error') actualizar()
          }}
          testID="reintentar-zonas"
        />
      ) : estadoMar.fase !== 'lista' || zonas.estado !== 'lista' ? (
        <View style={estilos.cargando} testID="cargando-zonas">
          <ActivityIndicator color={color.marea} accessibilityLabel={textos.comun.cargando} />
        </View>
      ) : (
        <View style={estilos.lista} testID="lista-zonas">
          {estadoMar.datos.estado.zones.map((zona) => (
            <FilaZona
              key={zona.laboratory.code}
              zona={zona}
              seguida={zonas.seguidas.has(zona.laboratory.code)}
              ocupada={zonas.ocupada === zona.laboratory.code}
              alCambiar={() => void zonas.alternar(zona.laboratory.code)}
            />
          ))}
        </View>
      )}
    </Pantalla>
  )
}

const estilos = StyleSheet.create({
  ayuda: {
    fontSize: tamano.secundario,
    lineHeight: tamano.secundario * 1.45,
    color: color['tinta-tenue'],
  },
  cargando: { paddingVertical: 32, alignItems: 'center' },
  lista: {
    borderRadius: medida.radioTarjeta,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.blanco,
    overflow: 'hidden',
  },
  fila: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.borde,
  },
  nombre: { flexShrink: 1, gap: 4 },
  nombreTexto: { fontFamily: fuente.titulo, fontWeight: '600', fontSize: 18, lineHeight: 23 },
  situacion: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  situacionTexto: { fontSize: 13.5, lineHeight: 19, color: color['tinta-tenue'] },
})
