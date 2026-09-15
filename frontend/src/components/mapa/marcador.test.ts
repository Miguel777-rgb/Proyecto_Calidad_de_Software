import { describe, expect, it } from 'vitest'
import { escaparHtml, htmlMarcador, nombreMarcador } from './marcador'
import { COLORES } from '@ola/compartido/mapa/paleta'
import type { EstadoZona } from '../../api/client'
import { ESTADO_MUESTRA } from '../../test-utils'

const buscar = (code: string): EstadoZona =>
  ESTADO_MUESTRA.zones.find((z) => z.laboratory.code === code)!

describe('htmlMarcador', () => {
  it('pinta el marcador con el color de su estado', () => {
    expect(htmlMarcador(buscar('CALLAO'))).toContain(`--estado:${COLORES.warm}`)
    expect(htmlMarcador(buscar('PISCO'))).toContain(`--estado:${COLORES.cold}`)
  })

  it('usa un simbolo distinto para cada estado', () => {
    const simbolos = ['CALLAO', 'TUMBES', 'PISCO', 'MATARANI'].map((code) =>
      htmlMarcador(buscar(code)).match(/<svg[^>]*>(.*)<\/svg>/)?.[1],
    )
    expect(new Set(simbolos).size).toBe(4)
  })

  it('marca las zonas en alerta para dibujar su anillo', () => {
    expect(htmlMarcador(buscar('CALLAO'))).toContain('data-alerta="true"')
    expect(htmlMarcador(buscar('HUACHO'))).toContain('data-alerta="false"')
  })

  it('incluye el nombre de la zona para lectores de pantalla', () => {
    expect(htmlMarcador(buscar('CALLAO'))).toContain(
      '<span class="sr-only">Callao: cálido, en alerta</span>',
    )
  })

  it('escapa un nombre que traiga caracteres de HTML', () => {
    const zona = { ...buscar('HUACHO'), laboratory: { ...buscar('HUACHO').laboratory, name: '<b>X</b>' } }
    expect(htmlMarcador(zona)).not.toContain('<b>')
    expect(htmlMarcador(zona)).toContain('&lt;b&gt;X&lt;/b&gt;')
  })
})

describe('nombreMarcador', () => {
  it('sin alerta dice solo el estado', () => {
    expect(nombreMarcador(buscar('HUACHO'))).toBe('Huacho: cálido')
  })

  it('una zona sin datos recientes lo dice', () => {
    expect(nombreMarcador(buscar('MATARANI'))).toBe('Matarani: sin datos recientes')
  })
})

describe('escaparHtml', () => {
  it('escapa los cinco caracteres especiales', () => {
    expect(escaparHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
