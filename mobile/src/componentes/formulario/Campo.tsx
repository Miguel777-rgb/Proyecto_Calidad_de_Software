import { textos } from '@ola/compartido/i18n/textos'
import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native'
import { cancelarAutocompletado } from '../../../modules/autocompletado'
import { color, fuente, medida, tamano } from '../../tema'
import { Texto } from '../Texto'

type Tipo = 'correo' | 'texto' | 'codigo' | 'contrasena'

interface Props {
  etiqueta: string
  valor: string
  alCambiar: (valor: string) => void
  tipo?: Tipo
  /** Se muestra junto a la etiqueta: «(opcional)». */
  opcional?: boolean
  /** Texto de ayuda bajo el campo, como la regla de la contrasena. */
  nota?: string
  testID?: string
  alEnviar?: () => void
}

const TECLADO: Record<Tipo, KeyboardTypeOptions> = {
  correo: 'email-address',
  texto: 'default',
  codigo: 'number-pad',
  contrasena: 'default',
}

/**
 * Campo de formulario de la cuenta. Sin autocompletado de Android, como se
 * decidio en la fase 3: `autoComplete="off"` no basta desde Android 14, asi que
 * al recibir el foco se cancela la sesion que el sistema abre igual (D-32). La
 * contrasena lleva un ojo para mostrarla.
 */
export function Campo({
  etiqueta,
  valor,
  alCambiar,
  tipo = 'texto',
  opcional = false,
  nota,
  testID,
  alEnviar,
}: Props) {
  const [foco, setFoco] = useState(false)
  const [visible, setVisible] = useState(false)
  const esContrasena = tipo === 'contrasena'

  return (
    <View style={estilos.campo}>
      <Texto style={estilos.etiqueta} importantForAccessibility="no">
        {etiqueta}
        {opcional && <Texto style={estilos.opcional}> ({textos.comun.opcional})</Texto>}
      </Texto>
      <View style={[estilos.caja, foco && estilos.cajaFoco]}>
        <TextInput
          testID={testID}
          accessibilityLabel={etiqueta}
          accessibilityHint={nota}
          value={valor}
          onChangeText={alCambiar}
          onFocus={() => {
            cancelarAutocompletado()
            setFoco(true)
          }}
          onBlur={() => setFoco(false)}
          onSubmitEditing={alEnviar}
          keyboardType={TECLADO[tipo]}
          secureTextEntry={esContrasena && !visible}
          autoCapitalize={tipo === 'texto' ? 'words' : 'none'}
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          maxLength={tipo === 'codigo' ? 6 : undefined}
          style={[estilos.entrada, tipo === 'codigo' && estilos.codigo]}
        />
        {esContrasena && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible ? textos.movil.ocultarContrasena : textos.movil.mostrarContrasena
            }
            onPress={() => setVisible((v) => !v)}
            style={estilos.ojo}
            testID={testID === undefined ? undefined : `${testID}-ojo`}
          >
            {visible ? (
              <EyeOff size={22} color={color['tinta-tenue']} aria-hidden />
            ) : (
              <Eye size={22} color={color['tinta-tenue']} aria-hidden />
            )}
          </Pressable>
        )}
      </View>
      {nota !== undefined && (
        <Texto style={estilos.nota} importantForAccessibility="no">
          {nota}
        </Texto>
      )}
    </View>
  )
}

const estilos = StyleSheet.create({
  campo: { gap: 6 },
  etiqueta: { fontWeight: '600', fontSize: tamano.secundario, lineHeight: tamano.secundario * 1.4 },
  opcional: { fontWeight: '400', color: color['tinta-tenue'], fontSize: tamano.secundario },
  caja: {
    minHeight: medida.toque + 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: color.borde,
    backgroundColor: color.blanco,
    paddingLeft: 14,
  },
  cajaFoco: { borderWidth: 2, borderColor: color.marea },
  entrada: {
    flex: 1,
    minHeight: medida.toque,
    paddingVertical: 8,
    paddingRight: 14,
    fontFamily: fuente.cuerpo,
    fontSize: tamano.texto,
    color: color.abisal,
  },
  codigo: { fontFamily: fuente.datos, fontSize: 24, letterSpacing: 8 },
  ojo: { width: medida.toque, height: medida.toque, alignItems: 'center', justifyContent: 'center' },
  nota: { fontSize: 14, lineHeight: 20, color: color['tinta-tenue'] },
})
