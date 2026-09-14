import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HojaInferior } from './HojaInferior'
import { violacionesAxe } from '../../test-utils'

function Prueba({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  return (
    <>
      <button type="button">Origen</button>
      <HojaInferior abierta={abierta} etiqueta="Detalle de Callao" alCerrar={alCerrar}>
        <button type="button">Primero</button>
        <a href="#historico">Ultimo</a>
      </HojaInferior>
    </>
  )
}

function montar(abierta = true, alCerrar = vi.fn()) {
  const resultado = render(<Prueba abierta={abierta} alCerrar={alCerrar} />)
  return { ...resultado, alCerrar }
}

function deslizar(elemento: HTMLElement, desde: number, hasta: number) {
  fireEvent.touchStart(elemento, { touches: [{ clientY: desde }] })
  fireEvent.touchMove(elemento, { touches: [{ clientY: hasta }] })
  fireEvent.touchEnd(elemento, { touches: [] })
}

describe('HojaInferior', () => {
  it('cerrada no muestra nada', () => {
    montar(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abierta es un dialogo modal con nombre', () => {
    montar()
    const dialogo = screen.getByRole('dialog', { name: 'Detalle de Callao' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
  })

  it('al abrirse lleva el foco a la hoja', () => {
    montar()
    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('Escape la cierra', async () => {
    const { alCerrar } = montar()
    await userEvent.setup().keyboard('{Escape}')
    expect(alCerrar).toHaveBeenCalledOnce()
  })

  it('tocar el fondo la cierra', async () => {
    const { alCerrar } = montar()
    await userEvent.setup().click(screen.getByTestId('fondo-hoja'))
    expect(alCerrar).toHaveBeenCalledOnce()
  })

  it('el tabulador no sale de la hoja', async () => {
    montar()
    const user = userEvent.setup()

    screen.getByRole('link', { name: 'Ultimo' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByRole('link', { name: 'Ultimo' })).toHaveFocus()
  })

  it('al cerrarse devuelve el foco a donde estaba', () => {
    const alCerrar = vi.fn()
    const { rerender } = render(<Prueba abierta={false} alCerrar={alCerrar} />)
    screen.getByRole('button', { name: 'Origen' }).focus()

    rerender(<Prueba abierta alCerrar={alCerrar} />)
    expect(screen.getByRole('dialog')).toHaveFocus()

    rerender(<Prueba abierta={false} alCerrar={alCerrar} />)
    expect(screen.getByRole('button', { name: 'Origen' })).toHaveFocus()
  })

  it('deslizarla hacia abajo la cierra', () => {
    const { alCerrar } = montar()
    deslizar(screen.getByRole('dialog'), 100, 220)
    expect(alCerrar).toHaveBeenCalledOnce()
  })

  it('un deslizamiento corto no la cierra', () => {
    const { alCerrar } = montar()
    deslizar(screen.getByRole('dialog'), 100, 140)
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('mientras esta abierta impide desplazar la pagina de fondo', () => {
    const { rerender } = render(<Prueba abierta alCerrar={vi.fn()} />)
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<Prueba abierta={false} alCerrar={vi.fn()} />)
    expect(document.body.style.overflow).toBe('')
  })

  it('no tiene violaciones de accesibilidad', async () => {
    montar()
    expect(await violacionesAxe(screen.getByRole('dialog'))).toEqual([])
  })
})
