import { describe, expect, it } from 'vitest'
import { COLORES, limitesDe, radioDe } from './paleta'
import type { EstadoZona } from '../../api/client'

const zona = (lat: string, lon: string, conAlerta = false): EstadoZona =>
  ({
    laboratory: { id: 1, code: 'X', name: 'X', latitude: lat, longitude: lon, is_active: true },
    state: 'warm',
    average_c: '1.0',
    last_anomaly_c: '1.0',
    last_measured_on: '2026-07-31',
    days_since_last: 0,
    is_stale: false,
    open_alert: conAlerta
      ? { id: 1, state: 'warm', started_on: '2026-07-26', streak_length: 6, peak_anomaly_c: '1.6' }
      : null,
  }) as EstadoZona

describe('COLORES', () => {
  it('define un color para cada estado posible', () => {
    expect(Object.keys(COLORES).sort()).toEqual(['cold', 'neutral', 'no_data', 'warm'])
  })

  it('usa colores distintos para cada estado', () => {
    const valores = Object.values(COLORES)
    expect(new Set(valores).size).toBe(valores.length)
  })
})

describe('radioDe', () => {
  it('agranda las zonas en alerta para que destaquen sin depender del color', () => {
    expect(radioDe(zona('-12', '-77', true))).toBeGreaterThan(radioDe(zona('-12', '-77')))
  })
})

describe('limitesDe', () => {
  it('encuadra todas las zonas dejando un margen', () => {
    const limites = limitesDe([zona('-3.5', '-80.4'), zona('-17.6', '-71.3')], 1)
    expect(limites).toEqual({ suroeste: [-18.6, -81.4], noreste: [-2.5, -70.3] })
  })

  it('se ajusta solo si el catalogo cambia', () => {
    const dos = limitesDe([zona('-5', '-81'), zona('-12', '-77')], 0)
    const tres = limitesDe([zona('-5', '-81'), zona('-12', '-77'), zona('-17', '-71')], 0)
    expect(tres!.suroeste[0]).toBeLessThan(dos!.suroeste[0])
  })

  it('sin zonas no hay encuadre', () => {
    expect(limitesDe([])).toBeNull()
  })

  it('con una sola zona el margen evita un encuadre de tamano cero', () => {
    const limites = limitesDe([zona('-12', '-77')], 1.5)!
    expect(limites.noreste[0]).toBeGreaterThan(limites.suroeste[0])
  })
})
