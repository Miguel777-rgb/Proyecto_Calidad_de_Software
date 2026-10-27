import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PALETA } from '@ola/compartido/tema/colores'
import { describe, expect, it } from 'vitest'

/**
 * La web declara los colores en tema.css (Tailwind los necesita como CSS) y la
 * app movil los toma de @ola/compartido. Esta prueba impide que las dos
 * fuentes se separen: un color cambiado en un solo lado falla aqui.
 */
const css = readFileSync(resolve(__dirname, 'tema.css'), 'utf8')
const declarados = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, nombre, valor]) => [
    nombre,
    valor.toLowerCase(),
  ]),
)

describe('tema.css y la paleta compartida', () => {
  it('cada color de la paleta compartida esta en tema.css con el mismo valor', () => {
    for (const [nombre, valor] of Object.entries(PALETA)) {
      expect(declarados[nombre], `--color-${nombre}`).toBe(valor)
    }
  })

  it('tema.css no declara colores que la app movil no conozca', () => {
    expect(Object.keys(declarados).sort()).toEqual(Object.keys(PALETA).sort())
  })
})
