import { describe, expect, it } from 'vitest'
import {
  conteoPorEstado,
  diasDesde,
  fechaCorta,
  gradosConSigno,
  ordenarZonas,
  unirNombres,
} from './datos'
import type { EstadoZona } from '../../api/client'
import { ESTADO_MUESTRA } from '../../test-utils'

const codigos = (zonas: EstadoZona[]) => zonas.map((z) => z.laboratory.code)

describe('fechaCorta', () => {
  it('escribe la fecha como dd/mm/aaaa', () => {
    expect(fechaCorta('2026-07-31')).toBe('31/07/2026')
  })

  it('rellena dia y mes con cero', () => {
    expect(fechaCorta('2026-01-05')).toBe('05/01/2026')
  })

  it('no retrocede un dia en la zona horaria de Peru', () => {
    const zonaOriginal = process.env.TZ
    process.env.TZ = 'America/Lima'
    try {
      // Leer la fecha como UTC la mostraria como el 30 de junio.
      expect(new Date('2026-07-01').getDate()).toBe(30)
      expect(fechaCorta('2026-07-01')).toBe('01/07/2026')
    } finally {
      process.env.TZ = zonaOriginal
    }
  })
})

describe('diasDesde', () => {
  it('cuenta los dias de calendario hasta hoy', () => {
    expect(diasDesde('2026-07-31', new Date(2026, 8, 14))).toBe(45)
  })

  it('un dato de hoy tiene cero dias', () => {
    expect(diasDesde('2026-07-31', new Date(2026, 6, 31, 18, 30))).toBe(0)
  })

  it('la hora del dia no cambia la cuenta', () => {
    expect(diasDesde('2026-07-31', new Date(2026, 8, 14, 23, 59))).toBe(45)
  })
})

describe('ordenarZonas', () => {
  it('pone primero las zonas en alerta y conserva el orden del catalogo', () => {
    const conAlertaEnPisco = ESTADO_MUESTRA.zones.map((z) =>
      z.laboratory.code === 'PISCO'
        ? {
            ...z,
            open_alert: {
              id: 2,
              state: 'cold' as const,
              started_on: '2026-07-28',
              streak_length: 5,
              peak_anomaly_c: '-1.5000',
            },
          }
        : z,
    )

    expect(codigos(ordenarZonas(conAlertaEnPisco))).toEqual([
      'CALLAO',
      'PISCO',
      'HUACHO',
      'TUMBES',
      'MATARANI',
    ])
  })

  it('no modifica la lista recibida', () => {
    const original = [...ESTADO_MUESTRA.zones].reverse()
    const copia = [...original]
    ordenarZonas(original)
    expect(original).toEqual(copia)
  })
})

describe('conteoPorEstado', () => {
  it('cuenta las zonas de cada estado', () => {
    expect(conteoPorEstado(ESTADO_MUESTRA.zones)).toEqual({
      warm: 2,
      neutral: 1,
      cold: 1,
      no_data: 1,
    })
  })

  it('incluye los estados sin ninguna zona', () => {
    expect(conteoPorEstado([])).toEqual({ warm: 0, neutral: 0, cold: 0, no_data: 0 })
  })
})

describe('gradosConSigno', () => {
  it('marca con + las anomalias positivas', () => {
    expect(gradosConSigno('1.5800')).toBe('+1.58 °C')
  })

  it('conserva el signo de las negativas', () => {
    expect(gradosConSigno('-0.7400')).toBe('-0.74 °C')
  })

  it('un valor que redondea a cero no lleva signo', () => {
    expect(gradosConSigno('0.0000')).toBe('0.00 °C')
    expect(gradosConSigno('-0.0010')).toBe('0.00 °C')
  })

  it('sin valor muestra una raya', () => {
    expect(gradosConSigno(null)).toBe('—')
  })
})

describe('unirNombres', () => {
  it('con un nombre lo devuelve tal cual', () => {
    expect(unirNombres(['Callao'])).toBe('Callao')
  })

  it('une dos nombres con «y»', () => {
    expect(unirNombres(['Callao', 'Pisco'])).toBe('Callao y Pisco')
  })

  it('separa con comas y une el ultimo con «y»', () => {
    expect(unirNombres(['Callao', 'Pisco', 'Tumbes'])).toBe('Callao, Pisco y Tumbes')
  })

  it('usa «e» antes de una palabra que suena a «i»', () => {
    expect(unirNombres(['Pisco', 'Ilo'])).toBe('Pisco e Ilo')
  })

  it('usa «y» cuando la «i» forma diptongo o no suena al inicio', () => {
    expect(unirNombres(['Tumbes', 'Huacho'])).toBe('Tumbes y Huacho')
    expect(unirNombres(['Tumbes', 'Hierro'])).toBe('Tumbes y Hierro')
  })

  it('sin nombres devuelve texto vacio', () => {
    expect(unirNombres([])).toBe('')
  })
})
