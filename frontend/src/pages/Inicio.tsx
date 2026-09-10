import { useEffect, useState } from 'react'
import { getHealth } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { textos } from '../i18n/textos'

type EstadoConexion = 'verificando' | 'ok' | 'error'

export default function Inicio() {
  const { usuario } = useAuth()
  const [conexion, setConexion] = useState<EstadoConexion>('verificando')

  useEffect(() => {
    let vigente = true
    getHealth()
      .then(() => vigente && setConexion('ok'))
      .catch(() => vigente && setConexion('error'))
    return () => {
      vigente = false
    }
  }, [])

  return (
    <section>
      <h2>{textos.inicio.bienvenida}</h2>

      {usuario !== null && (
        <p data-testid="sesion-actual">
          {textos.inicio.sesionComo} <strong>{usuario.email}</strong> (
          {usuario.role === 'admin' ? textos.inicio.administrador : textos.inicio.usuario})
        </p>
      )}

      <p
        className={`conexion conexion--${conexion}`}
        data-testid="estado-conexion"
        role="status"
      >
        {textos.conexion[conexion]}
      </p>

      <p className="tenue">{textos.inicio.proximamente}</p>
    </section>
  )
}
