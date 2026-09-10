import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { textos } from './i18n/textos'

afterEach(() => {
  vi.unstubAllGlobals()
})

function simularRespuesta(ok: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 503,
      json: async () => ({ status: ok ? 'ok' : 'unavailable' }),
    }),
  )
}

describe('App', () => {
  it('muestra el titulo y la atribucion obligatoria a IMARPE', async () => {
    simularRespuesta(true)
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(textos.app.nombre)
    expect(screen.getByTestId('atribucion')).toHaveTextContent('IMARPE')
    // Espera al estado asincrono para no dejar una actualizacion fuera de act().
    await screen.findByText(textos.conexion.ok)
  })

  it('informa cuando el servidor responde', async () => {
    simularRespuesta(true)
    render(<App />)
    expect(await screen.findByText(textos.conexion.ok)).toBeInTheDocument()
  })

  it('informa cuando el servidor no responde', async () => {
    simularRespuesta(false)
    render(<App />)
    expect(await screen.findByText(textos.conexion.error)).toBeInTheDocument()
  })
})
