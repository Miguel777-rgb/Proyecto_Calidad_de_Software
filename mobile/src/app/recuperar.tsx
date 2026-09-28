import { ApiError } from '@ola/compartido/api'
import { CONTRASENA_MIN_LENGTH, textos } from '@ola/compartido/i18n/textos'
import { esCodigoValido, esCorreoValido, limpiarCodigo } from '@ola/compartido/validacion'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { api } from '../api'
import { Campo } from '../componentes/formulario/Campo'
import { Enlace } from '../componentes/formulario/Enlace'
import { Formulario } from '../componentes/formulario/Formulario'
import { Mensaje } from '../componentes/formulario/Mensaje'
import { Boton } from '../componentes/pantalla/Boton'
import { Texto } from '../componentes/Texto'
import { volverTrasEntrar } from '../navegacion'
import { useSesion } from '../sesion'
import { color, tamano } from '../tema'

/** Segundos antes de poder pedir otro codigo: el backend no envia antes. */
export const ESPERA_REENVIO = 60

/**
 * Recuperar la contrasena (RF-07): pedir un codigo por correo y escribirlo con
 * la contrasena nueva. La respuesta es la misma aunque el correo no tenga
 * cuenta. Al cambiarla, la persona queda dentro y vuelve adonde estaba.
 */
export default function Recuperar() {
  const { correo, volver } = useLocalSearchParams<{ correo?: string; volver?: string }>()
  const { restablecer } = useSesion()
  const [email, setEmail] = useState(correo ?? '')
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [espera, setEspera] = useState(0)

  useEffect(() => {
    if (espera <= 0) return
    const temporizador = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(temporizador)
  }, [espera])

  async function enviarCodigo(destino: string) {
    setError(null)
    if (!esCorreoValido(destino)) {
      setError(textos.errores.correoInvalido)
      return
    }
    setOcupado(true)
    try {
      await api.pedirCodigo(destino.trim())
      setEnviadoA(destino.trim())
      setEspera(ESPERA_REENVIO)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setOcupado(false)
    }
  }

  async function alCambiar() {
    setError(null)
    if (!esCodigoValido(codigo)) {
      setError(textos.recuperar.codigoIncompleto)
      return
    }
    if (password.length < CONTRASENA_MIN_LENGTH) {
      setError(textos.errores.contrasenaCorta)
      return
    }
    setOcupado(true)
    try {
      await restablecer(enviadoA ?? email.trim(), codigo, password)
      volverTrasEntrar(volver)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setOcupado(false)
    }
  }

  if (enviadoA === null) {
    return (
      <Formulario testID="formulario-recuperar">
        <Texto style={estilos.ayuda}>{textos.recuperar.ayuda}</Texto>
        <Campo
          etiqueta={textos.comun.correo}
          tipo="correo"
          valor={email}
          alCambiar={setEmail}
          alEnviar={() => void enviarCodigo(email)}
          testID="recuperar-correo"
        />
        {error !== null && <Mensaje tipo="error" texto={error} testID="error-recuperar" />}
        <Boton
          texto={ocupado ? textos.recuperar.enviando : textos.recuperar.enviar}
          alPulsar={() => void enviarCodigo(email)}
          desactivado={ocupado}
          testID="enviar-codigo"
        />
      </Formulario>
    )
  }

  return (
    <Formulario testID="formulario-codigo">
      <Mensaje tipo="enviado" texto={textos.recuperar.enviado(enviadoA)} testID="codigo-enviado" />
      <Campo
        etiqueta={textos.recuperar.codigo}
        tipo="codigo"
        valor={codigo}
        alCambiar={(texto) => setCodigo(limpiarCodigo(texto))}
        testID="recuperar-codigo"
      />
      <Campo
        etiqueta={textos.recuperar.nueva}
        tipo="contrasena"
        valor={password}
        alCambiar={setPassword}
        nota={textos.registro.ayudaContrasena}
        alEnviar={alCambiar}
        testID="recuperar-contrasena"
      />
      {error !== null && <Mensaje tipo="error" texto={error} testID="error-recuperar" />}
      <Boton
        texto={ocupado ? textos.recuperar.cambiando : textos.recuperar.boton}
        alPulsar={alCambiar}
        desactivado={ocupado}
        testID="cambiar-contrasena"
      />
      {espera > 0 ? (
        <Texto style={estilos.espera} testID="espera-codigo">
          {textos.recuperar.espera(espera)}
        </Texto>
      ) : (
        <Enlace
          texto={textos.recuperar.reenviar}
          alPulsar={() => void enviarCodigo(enviadoA)}
          testID="reenviar-codigo"
        />
      )}
    </Formulario>
  )
}

const estilos = StyleSheet.create({
  ayuda: {
    fontSize: tamano.secundario,
    lineHeight: tamano.secundario * 1.45,
    color: color['tinta-tenue'],
  },
  espera: { textAlign: 'center', fontSize: 14.5, color: color['tinta-tenue'] },
})
