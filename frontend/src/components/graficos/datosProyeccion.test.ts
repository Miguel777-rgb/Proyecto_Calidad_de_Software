import { describe, expect, it } from 'vitest'
import { aFilasDeProyeccion, inicioDelTramoEstimado } from './datosProyeccion'
import { proyeccionDe } from '../../test-utils'

describe('aFilasDeProyeccion', () => {
  it('coloca el historico antes de las estimaciones', () => {
    const filas = aFilasDeProyeccion(proyeccionDe())
    const fechas = filas.map((f) => f.fecha)
    expect(fechas).toEqual([...fechas].sort())
  })

  it('el historico solo lleva valores medidos', () => {
    const filas = aFilasDeProyeccion(proyeccionDe())
    // La ultima fila del historico es el punto de union con las estimaciones.
    const soloHistorico = filas.slice(0, -4)
    expect(soloHistorico.every((f) => f.medido !== null)).toBe(true)
    expect(soloHistorico.every((f) => f.tendencia === null && f.nivel === null)).toBe(true)
  })

  it('el tramo estimado no lleva valores medidos', () => {
    const filas = aFilasDeProyeccion(proyeccionDe())
    const estimadas = filas.slice(-3)
    expect(estimadas.every((f) => f.medido === null)).toBe(true)
    expect(estimadas.every((f) => f.tendencia !== null && f.nivel !== null)).toBe(true)
  })

  it('engancha las estimaciones al ultimo valor medido', () => {
    // Sin esto las lineas punteadas empezarian flotando, desconectadas.
    const proyeccion = proyeccionDe()
    const filas = aFilasDeProyeccion(proyeccion)
    const union = filas.find((f) => f.fecha === proyeccion.last_measured_on)!

    expect(union.medido).not.toBeNull()
    expect(union.tendencia).toBe(union.medido)
    expect(union.nivel).toBe(union.medido)
  })

  it('incluye las dos estimaciones en cada fila proyectada', () => {
    const filas = aFilasDeProyeccion(proyeccionDe())
    const estimada = filas.at(-1)!
    expect(estimada.tendencia).not.toBe(estimada.nivel)
  })

  it('sin proyeccion devuelve solo el historico', () => {
    const filas = aFilasDeProyeccion(proyeccionDe({ linear: null, weighted: null }))
    expect(filas.every((f) => f.tendencia === null && f.nivel === null)).toBe(true)
  })

  it('sin historico no revienta', () => {
    expect(aFilasDeProyeccion(proyeccionDe({ history: [] }))).toHaveLength(3)
  })
})

describe('inicioDelTramoEstimado', () => {
  it('es la fecha del ultimo dato medido', () => {
    const proyeccion = proyeccionDe()
    expect(inicioDelTramoEstimado(proyeccion)).toBe(proyeccion.last_measured_on)
  })

  it('sin historico no hay tramo que sombrear', () => {
    expect(inicioDelTramoEstimado(proyeccionDe({ history: [] }))).toBeNull()
  })
})
