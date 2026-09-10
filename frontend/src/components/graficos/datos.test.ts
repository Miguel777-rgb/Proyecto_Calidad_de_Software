import { describe, expect, it } from 'vitest'
import { aFilasDeGrafico, dominioVertical, etiquetaPeriodo, marcasVerticales } from './datos'
import type { SerieLaboratorio } from '../../api/client'

const lab = (code: string) => ({
  id: 1,
  code,
  name: code,
  latitude: '-12',
  longitude: '-77',
  is_active: true,
})

const serie = (code: string, valores: (string | null)[]): SerieLaboratorio => ({
  laboratory: lab(code),
  points: valores.map((v, i) => ({
    period: `2026-07-${String(i + 1).padStart(2, '0')}`,
    anomaly_c: v,
    samples: v === null ? 0 : 1,
  })),
})

describe('aFilasDeGrafico', () => {
  it('convierte una serie en filas con su periodo', () => {
    const filas = aFilasDeGrafico([serie('CALLAO', ['1.5', '2.0'])])
    expect(filas).toEqual([
      { period: '2026-07-01', CALLAO: 1.5 },
      { period: '2026-07-02', CALLAO: 2 },
    ])
  })

  it('combina varias series en la misma fila', () => {
    const filas = aFilasDeGrafico([serie('CALLAO', ['1.5']), serie('PISCO', ['-0.8'])])
    expect(filas[0]).toEqual({ period: '2026-07-01', CALLAO: 1.5, PISCO: -0.8 })
  })

  it('conserva los periodos sin dato como null', () => {
    // Es lo que hace que el grafico CORTE la linea en lugar de inventar
    // una tendencia entre dos puntos lejanos.
    const filas = aFilasDeGrafico([serie('CALLAO', ['1.5', null, '2.0'])])
    expect(filas[1].CALLAO).toBeNull()
  })

  it('sin series devuelve una tabla vacia', () => {
    expect(aFilasDeGrafico([])).toEqual([])
  })

  it('una serie enteramente sin datos da filas con null', () => {
    const filas = aFilasDeGrafico([serie('MATARANI', [null, null])])
    expect(filas.every((f) => f.MATARANI === null)).toBe(true)
  })
})

describe('etiquetaPeriodo', () => {
  it('en resolucion diaria muestra dia y mes', () => {
    expect(etiquetaPeriodo('2026-07-31', 'daily')).toBe('31/07')
  })

  it('en resolucion mensual muestra mes y ano abreviado', () => {
    expect(etiquetaPeriodo('2026-07-01', 'monthly')).toBe('07/26')
  })

  it('en resolucion semanal muestra dia y mes', () => {
    expect(etiquetaPeriodo('2026-07-27', 'weekly')).toBe('27/07')
  })
})

describe('dominioVertical', () => {
  const filasCon = (valores: (string | null)[]) => aFilasDeGrafico([serie('X', valores)])

  it('siempre incluye el cero', () => {
    // La anomalia es una desviacion: sin el cero, el signo pierde sentido.
    const [minimo, maximo] = dominioVertical(filasCon(['2.0', '5.0']), ['X'])
    expect(minimo).toBeLessThanOrEqual(0)
    expect(maximo).toBeGreaterThan(5)
  })

  it('con valores solo positivos apenas asoma bajo el cero', () => {
    // Forzar la simetria aplastaria la senal en media grafica. Se deja un
    // margen minimo para que la linea del cero y la del umbral se vean,
    // en lugar de quedar pegadas al borde del eje.
    const [minimo] = dominioVertical(filasCon(['3.0', '6.0']), ['X'])
    expect(minimo).toBeLessThan(0)
    expect(minimo).toBeGreaterThanOrEqual(-0.5)
  })

  it('con valores solo negativos apenas asoma sobre el cero', () => {
    const [, maximo] = dominioVertical(filasCon(['-3.0', '-6.0']), ['X'])
    expect(maximo).toBeGreaterThan(0)
    expect(maximo).toBeLessThanOrEqual(0.5)
  })

  it('el margen no crece con la magnitud de los datos', () => {
    // Con valores de 6 grados, el eje no debe bajar a -6.
    const [pequeno] = dominioVertical(filasCon(['1.0']), ['X'])
    const [grande] = dominioVertical(filasCon(['6.0']), ['X'])
    expect(grande).toBe(pequeno)
  })

  it('abarca ambos signos cuando la serie los cruza', () => {
    const [minimo, maximo] = dominioVertical(filasCon(['-2.0', '3.0']), ['X'])
    expect(minimo).toBeLessThan(-2)
    expect(maximo).toBeGreaterThan(3)
  })

  it('deja margen para que el extremo no toque el borde', () => {
    const [, maximo] = dominioVertical(filasCon(['5.0']), ['X'])
    expect(maximo).toBeGreaterThan(5)
  })

  it('sin valores devuelve un rango legible', () => {
    expect(dominioVertical(filasCon([null, null]), ['X'])).toEqual([-1, 1])
  })
})

describe('marcasVerticales', () => {
  it('siempre incluye el cero', () => {
    expect(marcasVerticales([0, 7])).toContain(0)
    expect(marcasVerticales([-3, 5])).toContain(0)
  })

  it('usa medios grados en rangos estrechos', () => {
    expect(marcasVerticales([-1, 1])).toEqual([-1, -0.5, 0, 0.5, 1])
  })

  it('usa grados enteros en rangos medianos', () => {
    expect(marcasVerticales([0, 7])).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('espacia mas las marcas en rangos amplios', () => {
    const marcas = marcasVerticales([-10, 10])
    expect(marcas.length).toBeLessThanOrEqual(12)
    expect(marcas).toContain(0)
  })

  it('las marcas van en orden ascendente', () => {
    const marcas = marcasVerticales([-3.5, 4.5])
    expect(marcas).toEqual([...marcas].sort((a, b) => a - b))
  })
})
