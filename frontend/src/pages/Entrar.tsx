import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { textos } from '../i18n/textos'

export default function Entrar() {
  const { usuario, entrar } = useAuth()
  const ubicacion = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario !== null) {
    const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'
    return <Navigate to={destino} replace />
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await entrar(email, password)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="tarjeta">
      <h2>{textos.entrar.titulo}</h2>
      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="email">{textos.comun.correo}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">{textos.comun.contrasena}</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error !== null && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={enviando}>
          {enviando ? textos.entrar.enviando : textos.entrar.boton}
        </button>
      </form>
      <p>
        {textos.entrar.sinCuenta} <Link to="/registro">{textos.entrar.crearla}</Link>
      </p>
    </section>
  )
}
