import { describe, expect, it } from 'vitest'
import { contrasteEntre } from '../mapa/paleta'
import { PALETA } from './colores'

/**
 * Pares de texto y fondo que la web y la app usan de verdad. Si un color
 * cambia, esta tabla dice si el texto sigue siendo legible (WCAG 1.4.3).
 */
const TEXTOS: [texto: keyof typeof PALETA, fondo: keyof typeof PALETA, uso: string][] = [
  ['abisal', 'espuma', 'texto principal sobre la pagina'],
  ['abisal', 'blanco', 'texto principal sobre tarjetas'],
  ['tinta-tenue', 'espuma', 'texto secundario sobre la pagina'],
  ['tinta-tenue', 'blanco', 'texto secundario sobre tarjetas'],
  ['tinta-tenue', 'realce', 'etiqueta de fase provisional'],
  ['espuma', 'abisal', 'logotipo y pestana activa'],
  ['espuma-tenue', 'abisal', 'texto secundario sobre la banda'],
  ['abisal', 'dorado', 'boton Entrar y contador de avisos'],
  ['marea', 'marea-fondo', 'rol de la cuenta'],
]

describe('PALETA', () => {
  it('todos los valores son colores hexadecimales de seis cifras', () => {
    for (const valor of Object.values(PALETA)) expect(valor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it.each(TEXTOS)('%s sobre %s supera 4.5:1 (%s)', (texto, fondo) => {
    expect(contrasteEntre(PALETA[texto], PALETA[fondo])).toBeGreaterThanOrEqual(4.5)
  })

  it('el dorado se distingue de la banda para objetos graficos (3:1)', () => {
    expect(contrasteEntre(PALETA.dorado, PALETA.abisal)).toBeGreaterThanOrEqual(3)
  })
})
