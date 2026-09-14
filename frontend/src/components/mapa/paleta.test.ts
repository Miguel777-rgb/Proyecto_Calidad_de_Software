import { describe, expect, it } from 'vitest'
import { COLORES, TINTES, contrasteEntre, limitesDe, radioDe } from './paleta'

const ESPUMA = '#f3f7f5'
const BLANCO = '#ffffff'
const ABISAL = '#0a2530'
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

  it.each(Object.entries(COLORES))(
    'el color de %s se distingue del fondo espuma y del blanco (3:1)',
    (_estado, color) => {
      expect(contrasteEntre(color, ESPUMA)).toBeGreaterThanOrEqual(3)
      expect(contrasteEntre(color, BLANCO)).toBeGreaterThanOrEqual(3)
    },
  )

  it.each(Object.entries(COLORES))(
    'el simbolo blanco se distingue sobre el color de %s (3:1)',
    (_estado, color) => {
      expect(contrasteEntre(BLANCO, color)).toBeGreaterThanOrEqual(3)
    },
  )
})

describe('TINTES', () => {
  it('define un fondo para cada estado', () => {
    expect(Object.keys(TINTES).sort()).toEqual(Object.keys(COLORES).sort())
  })

  it.each(Object.entries(TINTES))(
    'el texto abisal se lee sobre el fondo de %s (4.5:1)',
    (_estado, tinte) => {
      expect(contrasteEntre(ABISAL, tinte)).toBeGreaterThanOrEqual(4.5)
    },
  )
})

describe('contrasteEntre', () => {
  it('negro sobre blanco da el maximo de 21:1', () => {
    expect(contrasteEntre('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('un color contra si mismo da 1:1', () => {
    expect(contrasteEntre('#2a6f97', '#2a6f97')).toBeCloseTo(1, 5)
  })

  it('no depende del orden de los colores', () => {
    expect(contrasteEntre('#0a2530', '#f3f7f5')).toBeCloseTo(contrasteEntre('#f3f7f5', '#0a2530'), 10)
  })

  it('coincide con el valor de referencia de WCAG para #767676 sobre blanco', () => {
    // #767676 es el gris mas claro que cumple 4.5:1 sobre blanco.
    expect(contrasteEntre('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })

  it('acepta mayusculas', () => {
    expect(contrasteEntre('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
  })

  it('rechaza un color que no tenga la forma #rrggbb', () => {
    expect(() => contrasteEntre('red', '#ffffff')).toThrow()
    expect(() => contrasteEntre('#fff', '#ffffff')).toThrow()
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
