import { ordenarZonas } from '@ola/compartido/inicio/datos'
import { textos } from '@ola/compartido/i18n/textos'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AvisoGuardado } from '../../componentes/inicio/AvisoGuardado'
import { Esqueleto } from '../../componentes/inicio/Esqueleto'
import { ResumenEstado } from '../../componentes/inicio/ResumenEstado'
import { TarjetasZonas } from '../../componentes/inicio/TarjetasZonas'
import { MapaZonas } from '../../componentes/mapa/MapaZonas'
import { ErrorConexion } from '../../componentes/pantalla/ErrorConexion'
import { Pantalla } from '../../componentes/pantalla/Pantalla'
import { Texto } from '../../componentes/Texto'
import { useEstadoMar } from '../../estado/EstadoMar'
import { marcarHito } from '../../hitos'
import { color, tamano } from '../../tema'

/**
 * Mapa: resumen, mapa con las 10 zonas y sus tarjetas, en una sola pantalla
 * que se desplaza como la web en celular. El detalle de cada zona es la ruta
 * /zona/[code], que se abre como hoja.
 */
export default function Mapa() {
  const { estadoMar, actualizar } = useEstadoMar()
  const [elegida, setElegida] = useState<string | null>(null)
  const [mapaDibujado, setMapaDibujado] = useState(false)
  const [hoy] = useState(() => new Date())

  // Al volver del detalle ninguna zona queda elegida.
  useFocusEffect(useCallback(() => setElegida(null), []))

  const lista = estadoMar.fase === 'lista' ? estadoMar : null
  const origen = lista?.origen
  const sinZonas = lista !== null && lista.datos.estado.zones.length === 0

  // Metrica de arranque (SRS 3.3): el estado recien llegado de la API ya se
  // ve, con resumen, tarjetas y marcadores. Los mosaicos del fondo no cuentan.
  useEffect(() => {
    if (origen === 'red' && (mapaDibujado || sinZonas)) marcarHito('estado-visible')
  }, [origen, mapaDibujado, sinZonas])

  const alElegir = useCallback((code: string) => {
    setElegida(code)
    router.push({ pathname: '/zona/[code]', params: { code } })
  }, [])

  const alDibujar = useCallback(() => setMapaDibujado(true), [])

  if (estadoMar.fase === 'error') return <ErrorConexion alReintentar={actualizar} />

  if (estadoMar.fase === 'cargando') {
    return (
      <Pantalla titulo={textos.estado.titulo}>
        <Esqueleto />
      </Pantalla>
    )
  }

  const { datos, sinConexion, actualizando, guardadoEn } = estadoMar
  const referencia = datos.estado.reference_date

  return (
    <Pantalla
      titulo={textos.estado.titulo}
      alActualizar={actualizar}
      actualizando={actualizando}
      aviso={
        sinConexion ? <AvisoGuardado guardadoEn={guardadoEn} alReintentar={actualizar} /> : null
      }
    >
      {referencia === null ? (
        <View style={estilos.sinDatos} testID="sin-datos">
          <Texto style={estilos.fuerte}>{textos.estado.sinDatosCargados}</Texto>
          <Texto style={estilos.secundario}>{textos.estado.sinDatosCargadosAyuda}</Texto>
        </View>
      ) : (
        <>
          <ResumenEstado
            referencia={referencia}
            zonas={datos.estado.zones}
            hoy={hoy}
            vigenciaDias={datos.vigencia}
          />
          <MapaZonas
            zonas={datos.estado.zones}
            seleccionada={elegida}
            alElegir={alElegir}
            alDibujar={alDibujar}
          />
          {datos.ventana !== null && (
            <Texto style={estilos.nota}>{textos.estado.explicacionPromedio(datos.ventana)}</Texto>
          )}
          <TarjetasZonas zonas={ordenarZonas(datos.estado.zones)} alElegir={alElegir} />
        </>
      )}
    </Pantalla>
  )
}

const estilos = StyleSheet.create({
  sinDatos: {
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color['atencion-borde'],
    backgroundColor: color['atencion-fondo'],
  },
  fuerte: { fontWeight: '600' },
  secundario: { fontSize: tamano.secundario, color: color['tinta-tenue'] },
  nota: { marginTop: -6, fontSize: 13.5, lineHeight: 19, color: color['tinta-tenue'] },
})
