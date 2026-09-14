import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AvisosProvider } from './avisos/AvisosProvider'
import { RutaProtegida } from './components/RutaProtegida'
import { EsqueletoInicio } from './components/inicio/EstadosCarga'
import { TituloInicio } from './components/inicio/TituloInicio'
import { ENVOLTURA_INICIO } from './components/inicio/estructura'
import { BarraInferior } from './components/marco/BarraInferior'
import { Cabecera } from './components/marco/Cabecera'
import { Pie } from './components/marco/Pie'
import { textos } from './i18n/textos'

// Cada pantalla se descarga al abrirla: la portada no trae Recharts y las
// pantallas de graficos no traen Leaflet. En celular es la mayor parte del peso.
const Admin = lazy(() => import('./pages/Admin'))
const Avisos = lazy(() => import('./pages/Avisos'))
const Comparacion = lazy(() => import('./pages/Comparacion'))
const Entrar = lazy(() => import('./pages/Entrar'))
const Historico = lazy(() => import('./pages/Historico'))
const Inicio = lazy(() => import('./pages/Inicio'))
const MisZonas = lazy(() => import('./pages/MisZonas'))
const Proyeccion = lazy(() => import('./pages/Proyeccion'))
const Registro = lazy(() => import('./pages/Registro'))

/**
 * Lo que se ve mientras llega el codigo de una pantalla. En la portada es la
 * misma silueta que Inicio muestra mientras llegan los datos, para que las dos
 * esperas se vean como una sola y nada salte.
 */
function CargandoPantalla() {
  const { pathname } = useLocation()
  if (pathname === '/') {
    return (
      <section className={ENVOLTURA_INICIO}>
        <TituloInicio />
        <EsqueletoInicio />
      </section>
    )
  }
  return (
    <p role="status" className="m-0 text-tinta-tenue">
      {textos.comun.cargando}
    </p>
  )
}

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
          <Suspense fallback={<CargandoPantalla />}>
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
          </Suspense>
        </main>

        <Pie />
        <BarraInferior />
      </div>
    </AvisosProvider>
  )
}
