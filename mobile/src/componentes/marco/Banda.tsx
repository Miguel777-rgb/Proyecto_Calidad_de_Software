import { textos } from '@ola/compartido/i18n/textos'
import { LogIn, UserRound } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSesion } from '../../sesion'
import { color, fuente, LETRA_MAXIMA, medida, tamano } from '../../tema'
import { Texto } from '../Texto'
import { HojaCuenta, type DestinoCuenta } from './HojaCuenta'

interface Props {
  alEntrar: () => void
  alIr: (destino: DestinoCuenta) => void
}

/**
 * Banda superior abisal con el logotipo y la cuenta. Pinta tambien la zona de
 * la hora: la app se dibuja de borde a borde y los iconos del sistema se ven
 * claros sobre ella.
 */
export function Banda({ alEntrar, alIr }: Props) {
  const { top } = useSafeAreaInsets()
  const { usuario, sinLeer, salir } = useSesion()
  const [cuentaAbierta, setCuentaAbierta] = useState(false)

  return (
    <View style={[estilos.banda, { paddingTop: top }]} testID="banda">
      <View style={estilos.fila}>
        <Texto
          accessibilityRole="header"
          maxFontSizeMultiplier={LETRA_MAXIMA.banda}
          style={estilos.logotipo}
        >
          {textos.app.nombre}
        </Texto>

        {usuario === null ? (
          <Pressable
            accessibilityRole="button"
            onPress={alEntrar}
            style={({ pressed }) => [estilos.entrar, pressed && estilos.entrarPulsado]}
            testID="entrar"
          >
            <LogIn size={20} color={color.abisal} aria-hidden />
            <Texto maxFontSizeMultiplier={LETRA_MAXIMA.banda} style={estilos.entrarTexto}>
              {textos.navegacion.entrar}
            </Texto>
          </Pressable>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                sinLeer > 0
                  ? textos.navegacion.menuCuentaConAvisos(sinLeer)
                  : textos.navegacion.menuCuenta
              }
              accessibilityState={{ expanded: cuentaAbierta }}
              onPress={() => setCuentaAbierta(true)}
              style={estilos.cuenta}
              testID="boton-cuenta"
            >
              <View style={estilos.avatar}>
                <UserRound size={20} color={color.espuma} aria-hidden />
              </View>
              {sinLeer > 0 && (
                <View style={estilos.insignia} testID="insignia-avisos">
                  <Texto maxFontSizeMultiplier={LETRA_MAXIMA.banda} style={estilos.insigniaTexto}>
                    {sinLeer > 99 ? '99+' : String(sinLeer)}
                  </Texto>
                </View>
              )}
            </Pressable>
            <HojaCuenta
              visible={cuentaAbierta}
              usuario={usuario}
              sinLeer={sinLeer}
              alCerrar={() => setCuentaAbierta(false)}
              alIr={alIr}
              alSalir={salir}
            />
          </>
        )}
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  banda: { backgroundColor: color.abisal },
  fila: {
    minHeight: medida.banda,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: medida.margen,
  },
  logotipo: {
    fontFamily: fuente.titulo,
    fontWeight: '700',
    fontSize: tamano.logotipo,
    lineHeight: tamano.logotipo * 1.1,
    letterSpacing: -0.9,
    color: color.espuma,
  },
  entrar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: color.dorado,
  },
  entrarPulsado: { backgroundColor: color['dorado-claro'] },
  entrarTexto: { fontSize: tamano.secundario, fontWeight: '600' },
  cuenta: { width: medida.toque, height: medida.toque, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color['abisal-3'],
  },
  insignia: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.dorado,
    borderWidth: 2,
    borderColor: color.abisal,
  },
  insigniaTexto: { fontSize: 12, lineHeight: 14, fontWeight: '700' },
})
