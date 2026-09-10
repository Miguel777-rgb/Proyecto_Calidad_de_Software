import { Link, Route, Routes } from 'react-router-dom'
import { RutaProtegida } from './components/RutaProtegida'
import { useAuth } from './auth/useAuth'
import { textos } from './i18n/textos'
import Admin from './pages/Admin'
import Comparacion from './pages/Comparacion'
import Entrar from './pages/Entrar'
import Historico from './pages/Historico'
import Inicio from './pages/Inicio'
import Registro from './pages/Registro'

function Navegacion() {
  const { usuario, salir } = useAuth()
  return (
    <nav>
      <Link to="/">{textos.navegacion.inicio}</Link>
      <Link to="/historico">{textos.navegacion.historico}</Link>
      <Link to="/comparar">{textos.navegacion.comparacion}</Link>
      {usuario === null ? (
        <>
          <Link to="/entrar">{textos.navegacion.entrar}</Link>
          <Link to="/registro">{textos.navegacion.registrarse}</Link>
        </>
      ) : (
        <>
          {usuario.role === 'admin' && (
            <Link to="/admin">{textos.navegacion.administracion}</Link>
          )}
          <span className="tenue" data-testid="sesion-actual">
            {textos.inicio.sesionComo} <strong>{usuario.email}</strong> (
            {usuario.role === 'admin' ? textos.inicio.administrador : textos.inicio.usuario})
          </span>
          <button type="button" className="enlace" onClick={salir}>
            {textos.navegacion.salir}
          </button>
        </>
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
          {/* El estado de las zonas es publico: la SRS busca dar visibilidad
              a un dato abierto, dirigido a pescadores artesanales. La cuenta
              solo hace falta para suscribirse a alertas (RF-07). */}
          <Route path="/" element={<Inicio />} />
          <Route
            path="/admin"
            element={
              <RutaProtegida soloAdmin>
                <Admin />
              </RutaProtegida>
            }
          />
          <Route path="/historico" element={<Historico />} />
          <Route path="/comparar" element={<Comparacion />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/registro" element={<Registro />} />
        </Routes>
      </main>

      <footer data-testid="atribucion">{textos.atribucion}</footer>
    </div>
  )
}
