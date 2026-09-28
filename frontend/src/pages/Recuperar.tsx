import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, pedirCodigo } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { textos, CONTRASENA_MIN_LENGTH } from '@ola/compartido/i18n/textos'
import { esCodigoValido, esCorreoValido, limpiarCodigo } from '@ola/compartido/validacion'

/** Segundos antes de poder pedir otro codigo: el backend no envia antes. */
export const ESPERA_REENVIO = 60

/**
 * Recuperar la contrasena en dos pasos (RF-07): pedir un codigo por correo y
 * escribirlo con la contrasena nueva. Al cambiarla, la persona queda dentro.
 */
export default function Recuperar() {
  const { usuario, restablecer } = useAuth()
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const correoInicial = (ubicacion.state as { correo?: string } | null)?.correo ?? ''
  const [email, setEmail] = useState(correoInicial)
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [espera, setEspera] = useState(0)

  // Cuenta atras para volver a pedir el codigo.
  useEffect(() => {
    if (espera <= 0) return
    const temporizador = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(temporizador)
  }, [espera])

  if (usuario !== null && !ocupado) return <Navigate to="/" replace />

  async function enviarCodigo(correo: string) {
    setError(null)
    if (!esCorreoValido(correo)) {
      setError(textos.errores.correoInvalido)
      return
    }
    setOcupado(true)
    try {
      await pedirCodigo(correo.trim())
      setEnviadoA(correo.trim())
      setEspera(ESPERA_REENVIO)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setOcupado(false)
    }
  }

  async function alPedir(evento: FormEvent) {
    evento.preventDefault()
    await enviarCodigo(email)
  }

  async function alCambiar(evento: FormEvent) {
    evento.preventDefault()
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
      await restablecer(enviadoA ?? email, codigo, password)
      navegar('/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
      setOcupado(false)
    }
  }

  const mensajeError = error !== null && (
    <p className="error" role="alert">
      {error}
    </p>
  )

  if (enviadoA === null) {
    return (
      <section className="tarjeta">
        <h2>{textos.recuperar.titulo}</h2>
        <p className="tenue">{textos.recuperar.ayuda}</p>
        <form onSubmit={alPedir} noValidate>
          <label htmlFor="email">{textos.comun.correo}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mensajeError}
          <button type="submit" disabled={ocupado}>
            {ocupado ? textos.recuperar.enviando : textos.recuperar.enviar}
          </button>
        </form>
        <p>
          <Link to="/entrar">{textos.registro.entrar}</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="tarjeta">
      <h2>{textos.recuperar.titulo}</h2>
      <p className="aviso-ok" role="status">
        {textos.recuperar.enviado(enviadoA)}
      </p>
      <form onSubmit={alCambiar} noValidate>
        <label htmlFor="codigo">{textos.recuperar.codigo}</label>
        <input
          id="codigo"
          className="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={codigo}
          onChange={(e) => setCodigo(limpiarCodigo(e.target.value))}
        />
        <label htmlFor="password">{textos.recuperar.nueva}</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby="ayuda-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <small id="ayuda-password" className="tenue">
          {textos.registro.ayudaContrasena}
        </small>
        {mensajeError}
        <button type="submit" disabled={ocupado}>
          {ocupado ? textos.recuperar.cambiando : textos.recuperar.boton}
        </button>
      </form>
      <p>
        {espera > 0 ? (
          <span className="tenue">{textos.recuperar.espera(espera)}</span>
        ) : (
          <button
            type="button"
            className="enlace"
            disabled={ocupado}
            onClick={() => void enviarCodigo(enviadoA)}
          >
            {textos.recuperar.reenviar}
          </button>
        )}
      </p>
    </section>
  )
}
