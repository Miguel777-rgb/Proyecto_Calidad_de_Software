import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { CONTRASENA_MIN_LENGTH, textos } from '../i18n/textos'

export default function Registro() {
  const { usuario, registrarse } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario !== null) return <Navigate to="/" replace />

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)

    // Se valida antes de llamar a la API para dar una respuesta inmediata
    // y en espanol, en lugar del mensaje tecnico de Pydantic.
    if (password.length < CONTRASENA_MIN_LENGTH) {
      setError(textos.errores.contrasenaCorta)
      return
    }

    setEnviando(true)
    try {
      await registrarse(email, password, nombre.trim() || undefined)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="tarjeta">
      <h2>{textos.registro.titulo}</h2>
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

        <label htmlFor="nombre">
          {textos.comun.nombre} <span className="tenue">({textos.comun.opcional})</span>
        </label>
        <input
          id="nombre"
          type="text"
          autoComplete="name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <label htmlFor="password">{textos.comun.contrasena}</label>
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

        {error !== null && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={enviando}>
          {enviando ? textos.registro.enviando : textos.registro.boton}
        </button>
      </form>
      <p>
        {textos.registro.yaTengoCuenta} <Link to="/entrar">{textos.registro.entrar}</Link>
      </p>
    </section>
  )
}
