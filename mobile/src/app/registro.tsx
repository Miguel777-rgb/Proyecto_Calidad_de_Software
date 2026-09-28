import { ApiError } from '@ola/compartido/api'
import { CONTRASENA_MIN_LENGTH, textos } from '@ola/compartido/i18n/textos'
import { esCorreoValido } from '@ola/compartido/validacion'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Campo } from '../componentes/formulario/Campo'
import { Enlace } from '../componentes/formulario/Enlace'
import { Formulario } from '../componentes/formulario/Formulario'
import { Mensaje } from '../componentes/formulario/Mensaje'
import { Boton } from '../componentes/pantalla/Boton'
import { Texto } from '../componentes/Texto'
import { volverTrasEntrar } from '../navegacion'
import { useSesion } from '../sesion'
import { tamano } from '../tema'

/** Crear cuenta (RF-07): los mismos campos que la web. */
export default function Registro() {
  const { volver } = useLocalSearchParams<{ volver?: string }>()
  const { registrarse } = useSesion()
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function alEnviar() {
    setError(null)
    // Se revisa antes de llamar a la API: respuesta inmediata y en espanol.
    if (!esCorreoValido(email)) {
      setError(textos.errores.correoInvalido)
      return
    }
    if (password.length < CONTRASENA_MIN_LENGTH) {
      setError(textos.errores.contrasenaCorta)
      return
    }
    setEnviando(true)
    try {
      await registrarse(email.trim(), password, nombre.trim() || undefined)
      volverTrasEntrar(volver)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Formulario testID="formulario-registro">
      <Campo
        etiqueta={textos.comun.correo}
        tipo="correo"
        valor={email}
        alCambiar={setEmail}
        testID="registro-correo"
      />
      <Campo
        etiqueta={textos.comun.nombre}
        opcional
        valor={nombre}
        alCambiar={setNombre}
        testID="registro-nombre"
      />
      <Campo
        etiqueta={textos.comun.contrasena}
        tipo="contrasena"
        valor={password}
        alCambiar={setPassword}
        nota={textos.registro.ayudaContrasena}
        alEnviar={alEnviar}
        testID="registro-contrasena"
      />
      {error !== null && <Mensaje tipo="error" texto={error} testID="error-registro" />}
      <Boton
        texto={enviando ? textos.registro.enviando : textos.registro.boton}
        alPulsar={alEnviar}
        desactivado={enviando}
        testID="registro-enviar"
      />
      <View style={estilos.pregunta}>
        <Texto style={estilos.preguntaTexto}>{textos.registro.yaTengoCuenta}</Texto>
        <Enlace
          texto={textos.registro.entrar}
          testID="ir-a-entrar"
          alPulsar={() => {
            if (router.canGoBack()) router.back()
            else router.replace({ pathname: '/entrar', params: { volver: volver ?? '' } })
          }}
        />
      </View>
    </Formulario>
  )
}

const estilos = StyleSheet.create({
  pregunta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  preguntaTexto: { fontSize: tamano.secundario },
})
