import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ESCRITORIO, useMediaQuery } from './useMediaQuery'

function simularMatchMedia(inicial: boolean) {
  const oyentes = new Set<() => void>()
  const lista = {
    matches: inicial,
    addEventListener: (_tipo: string, f: () => void) => oyentes.add(f),
    removeEventListener: (_tipo: string, f: () => void) => oyentes.delete(f),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => lista))
  return {
    oyentes,
    cambiar(valor: boolean) {
      lista.matches = valor
      oyentes.forEach((f) => f())
    },
  }
}

describe('useMediaQuery', () => {
  it('sin matchMedia vale false, la vista de celular', () => {
    const { result } = renderHook(() => useMediaQuery(ESCRITORIO))
    expect(result.current).toBe(false)
  })

  it('refleja si la consulta se cumple al montar', () => {
    simularMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery(ESCRITORIO))
    expect(result.current).toBe(true)
  })

  it('se actualiza cuando cambia el tamano de la ventana', () => {
    const medios = simularMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery(ESCRITORIO))

    act(() => medios.cambiar(true))
    expect(result.current).toBe(true)
  })

  it('deja de escuchar al desmontarse', () => {
    const medios = simularMatchMedia(false)
    const { unmount } = renderHook(() => useMediaQuery(ESCRITORIO))

    unmount()
    expect(medios.oyentes.size).toBe(0)
  })
})
