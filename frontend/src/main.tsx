import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Fuentes autoalojadas: sin llamadas a Google y disponibles sin red externa.
// Solo declaran @font-face; el navegador las descarga cuando algo las usa.
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/space-grotesk'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import './tema.css'
import './estilos.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
