import { Link, Route, Routes } from 'react-router-dom'
import { RutaProtegida } from './components/RutaProtegida'
import { useAuth } from './auth/useAuth'
import { textos } from './i18n/textos'
import Entrar from './pages/Entrar'
import Inicio from './pages/Inicio'
import Registro from './pages/Registro'

function Navegacion() {
  const { usuario, salir } = useAuth()
  return (
    <nav>
      <Link to="/">{textos.navegacion.inicio}</Link>
      {usuario === null ? (
        <>
          <Link to="/entrar">{textos.navegacion.entrar}</Link>
          <Link to="/registro">{textos.navegacion.registrarse}</Link>
        </>
      ) : (
        <button type="button" className="enlace" onClick={salir}>
          {textos.navegacion.salir}
        </button>
      )}
    </nav>
  )
}

export default function App() {
  return (
    <div className="contenedor">
      <header>
        <h1>
          {textos.app.nombre} <span className="subtitulo">{textos.app.titulo}</span>
        </h1>
        <p className="tenue">{textos.app.descripcion}</p>
        <Navegacion />
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <RutaProtegida>
                <Inicio />
              </RutaProtegida>
            }
          />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/registro" element={<Registro />} />
        </Routes>
      </main>

      <footer data-testid="atribucion">{textos.atribucion}</footer>
    </div>
  )
}
