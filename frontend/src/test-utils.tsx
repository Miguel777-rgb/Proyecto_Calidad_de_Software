import { render, type RenderOptions } from '@testing-library/react'
import { USUARIO } from '@ola/compartido/pruebas'
import axe from 'axe-core'
import { vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import type { Usuario } from './api/client'

// Los datos de ejemplo viven en el paquete compartido: los usa tambien la app
// movil, y asi las dos prueban contra las mismas respuestas.
export {
  ADMIN,
  ESTADO_MUESTRA,
  ESTADO_VACIO,
  LABORATORIOS,
  USUARIO,
  proyeccionDe,
  sesionDe,
  seriesDe,
} from '@ola/compartido/pruebas'

/**
 * Violaciones de accesibilidad que axe encuentra en un fragmento renderizado,
 * como lista de textos legibles para que un fallo diga que regla se rompio.
 *
 * Se desactivan dos reglas que jsdom no puede evaluar con sentido: el
 * contraste de color (jsdom no calcula estilos reales; lo comprueba Playwright)
 * y `region` (un componente suelto no vive dentro de un landmark).
 */
export async function violacionesAxe(contenedor: Element): Promise<string[]> {
  const resultado = await axe.run(contenedor, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return resultado.violations.map((v) => `${v.id}: ${v.help}`)
}

export function respuesta(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

export function renderConProveedores(
  ui: ReactElement,
  { ruta = '/', ...options }: RenderOptions & { ruta?: string } = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Deja una sesion iniciada antes de montar el componente.
 *
 * Guarda un token en el navegador simulado; el proveedor de sesion lo
 * revalidara contra /auth/me, que el simulador de fetch debe responder.
 */
export function conSesionIniciada(usuario: Usuario = USUARIO): void {
  localStorage.setItem('ola.token', 'token-de-prueba')
  void usuario
}

/** Enruta las respuestas simuladas por endpoint. La clave se busca como
 *  subcadena de la URL; `perfil` responde a /auth/me. */
export function apiPorRuta(
  rutas: Record<string, unknown>,
  usuario: Usuario = USUARIO,
): ReturnType<typeof vi.fn> {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const ruta = String(url)
    if (ruta.includes('/auth/me')) return respuesta(usuario)
    for (const [clave, cuerpo] of Object.entries(rutas)) {
      if (ruta.includes(clave)) {
        if (init?.method === 'DELETE' || init?.method === 'POST') {
          return typeof cuerpo === 'function'
            ? (cuerpo as (i?: RequestInit) => Response)(init)
            : respuesta(cuerpo, 201)
        }
        return respuesta(cuerpo)
      }
    }
    return respuesta({})
  })
}
