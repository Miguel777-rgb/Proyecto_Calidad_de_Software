import { describe, expect, it } from 'vitest'
import { ESTILOS_SERIE, MAX_SERIES, estiloDe, pasoDeMarcadores, trazadoForma } from './paletaSeries'

describe('ESTILOS_SERIE', () => {
  it('ofrece cuatro series, el maximo que admite la comparacion', () => {
    expect(ESTILOS_SERIE).toHaveLength(4)
    expect(MAX_SERIES).toBe(4)
  })

  it('usa un color distinto por serie', () => {
    const colores = ESTILOS_SERIE.map((e) => e.color)
    expect(new Set(colores).size).toBe(colores.length)
  })

  it('usa una forma distinta por serie', () => {
    // Es el canal que distingue las series sin depender del color.
    const formas = ESTILOS_SERIE.map((e) => e.forma)
    expect(new Set(formas).size).toBe(formas.length)
  })

  it('usa un patron de trazo distinto por serie', () => {
    // Tercer canal redundante: sobrevive a una impresion en blanco y negro.
    const trazos = ESTILOS_SERIE.map((e) => e.trazo ?? 'solido')
    expect(new Set(trazos).size).toBe(trazos.length)
  })
})

describe('estiloDe', () => {
  it('asigna los estilos en orden fijo', () => {
    expect(estiloDe(0)).toBe(ESTILOS_SERIE[0])
    expect(estiloDe(3)).toBe(ESTILOS_SERIE[3])
  })

  it('el estilo depende de la posicion, no de cuantas series haya', () => {
    // Quitar una zona no debe repintar a las demas.
    expect(estiloDe(1).color).toBe(ESTILOS_SERIE[1].color)
  })
})

describe('trazadoForma', () => {
  it.each(['circulo', 'cuadrado', 'triangulo', 'rombo'] as const)(
    'genera un trazado cerrado para %s',
    (forma) => {
      const d = trazadoForma(forma, 10, 10, 4)
      expect(d).toMatch(/^M/)
      expect(d.length).toBeGreaterThan(5)
    },
  )

  it('cada forma produce un trazado distinto', () => {
    const trazados = (['circulo', 'cuadrado', 'triangulo', 'rombo'] as const).map((f) =>
      trazadoForma(f, 10, 10, 4),
    )
    expect(new Set(trazados).size).toBe(4)
  })
})

describe('pasoDeMarcadores', () => {
  it('con pocos puntos marca todos', () => {
    expect(pasoDeMarcadores(8)).toBe(1)
  })

  it('con muchos puntos espacia los marcadores', () => {
    // 90 puntos diarios marcados uno a uno saturan el grafico.
    expect(pasoDeMarcadores(90)).toBeGreaterThan(1)
  })

  it('apunta a una docena de marcadores por serie', () => {
    for (const total of [50, 90, 365, 679]) {
      const marcadores = Math.ceil(total / pasoDeMarcadores(total))
      expect(marcadores).toBeLessThanOrEqual(13)
      expect(marcadores).toBeGreaterThanOrEqual(6)
    }
  })

  it('nunca devuelve cero, que dejaria el grafico sin marcadores', () => {
    expect(pasoDeMarcadores(0)).toBe(1)
  })
})
