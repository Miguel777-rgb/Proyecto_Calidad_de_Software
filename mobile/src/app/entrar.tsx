import { ApiError } from '@ola/compartido/api'
import { textos } from '@ola/compartido/i18n/textos'
import { esCorreoValido } from '@ola/compartido/validacion'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
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

/**
 * Iniciar sesion (RF-07). Si la API cerro la sesion a mitad de uso, llega con
 * `motivo=sesion` y lo explica. Al entrar vuelve a `volver`.
 */
export default function Entrar() {
  const { volver, motivo } = useLocalSearchParams<{ volver?: string; motivo?: string }>()
  const { entrar, sesionTermino, olvidarSesionTermino } = useSesion()
  const [avisoSesion] = useState(() => motivo === 'sesion' || sesionTermino)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // El aviso ya se muestra aqui: no hace falta volver a abrir Entrar.
  useEffect(() => {
    if (sesionTermino) olvidarSesionTermino()
  }, [sesionTermino, olvidarSesionTermino])

  async function alEnviar() {
    setError(null)
    if (!esCorreoValido(email)) {
      setError(textos.errores.correoInvalido)
      return
    }
    setEnviando(true)
    try {
      await entrar(email.trim(), password)
      volverTrasEntrar(volver)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Formulario testID="formulario-entrar">
      {avisoSesion && (
        <Mensaje tipo="sesion" texto={textos.movil.sesionTermino} testID="aviso-sesion" />
      )}
      <Campo
        etiqueta={textos.comun.correo}
        tipo="correo"
        valor={email}
        alCambiar={setEmail}
        testID="entrar-correo"
      />
      <Campo
        etiqueta={textos.comun.contrasena}
        tipo="contrasena"
        valor={password}
        alCambiar={setPassword}
        alEnviar={alEnviar}
        testID="entrar-contrasena"
      />
      {error !== null && <Mensaje tipo="error" texto={error} testID="error-entrar" />}
      <Enlace
        texto={textos.entrar.olvide}
        alinear="flex-end"
        testID="olvide"
        alPulsar={() =>
          router.push({ pathname: '/recuperar', params: { correo: email, volver: volver ?? '' } })
        }
      />
      <Boton
        texto={enviando ? textos.entrar.enviando : textos.entrar.boton}
        alPulsar={alEnviar}
        desactivado={enviando}
        testID="entrar-enviar"
      />
      <View style={estilos.pregunta}>
        <Texto style={estilos.preguntaTexto}>{textos.entrar.sinCuenta}</Texto>
        <Enlace
          texto={textos.entrar.crearla}
          testID="crear-cuenta"
          alPulsar={() => router.push({ pathname: '/registro', params: { volver: volver ?? '' } })}
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
