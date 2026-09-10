import { useEffect, useState } from 'react'
import { getHealth } from './api/client'
import { textos } from './i18n/textos'

type EstadoConexion = 'verificando' | 'ok' | 'error'

export default function App() {
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
    <main className="contenedor">
      <header>
        <h1>
          {textos.app.nombre} <span className="subtitulo">{textos.app.titulo}</span>
        </h1>
        <p>{textos.app.descripcion}</p>
      </header>

      <section
        className={`conexion conexion--${conexion}`}
        data-testid="estado-conexion"
        role="status"
      >
        {textos.conexion[conexion]}
      </section>

      <footer data-testid="atribucion">{textos.atribucion}</footer>
    </main>
  )
}
