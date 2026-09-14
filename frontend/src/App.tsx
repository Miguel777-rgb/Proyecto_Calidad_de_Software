import { Route, Routes } from 'react-router-dom'
import { AvisosProvider } from './avisos/AvisosProvider'
import { RutaProtegida } from './components/RutaProtegida'
import { BarraInferior } from './components/marco/BarraInferior'
import { Cabecera } from './components/marco/Cabecera'
import { Pie } from './components/marco/Pie'
import { textos } from './i18n/textos'
import Admin from './pages/Admin'
import Avisos from './pages/Avisos'
import Comparacion from './pages/Comparacion'
import Entrar from './pages/Entrar'
import Historico from './pages/Historico'
import MisZonas from './pages/MisZonas'
import Proyeccion from './pages/Proyeccion'
import Inicio from './pages/Inicio'
import Registro from './pages/Registro'

export default function App() {
  return (
    <AvisosProvider>
      {/* En celular la barra inferior es fija: el relleno inferior evita que
          tape el final de la pagina. */}
      <div className="flex min-h-dvh flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
        <a
          href="#contenido"
          className="sr-only rounded-lg bg-dorado px-4 py-2.5 font-semibold text-abisal focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          {textos.navegacion.saltar}
        </a>

        <Cabecera />

        <main id="contenido" tabIndex={-1} className="contenedor w-full flex-1 focus:outline-none">
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
            <Route path="/proyeccion" element={<Proyeccion />} />
            <Route
              path="/mis-zonas"
              element={
                <RutaProtegida>
                  <MisZonas />
                </RutaProtegida>
              }
            />
            <Route
              path="/avisos"
              element={
                <RutaProtegida>
                  <Avisos />
                </RutaProtegida>
              }
            />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/registro" element={<Registro />} />
          </Routes>
        </main>

        <Pie />
        <BarraInferior />
      </div>
    </AvisosProvider>
  )
}
