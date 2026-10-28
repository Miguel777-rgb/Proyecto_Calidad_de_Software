import { describe, expect, it } from 'vitest'
import { textos } from './textos'

const RESUMEN = { events_total: 4164, events_open: 8 }

describe('resumen de la evaluacion de alertas', () => {
  it('cuenta los episodios y los vigentes', () => {
    expect(textos.configuracion.resultadoEvaluacion(RESUMEN)).toBe(
      'Se registraron 4,164 episodios, de los cuales 8 siguen vigentes.',
    )
  })

  it('no menciona avisos si no hay ninguno nuevo', () => {
    const texto = textos.configuracion.resultadoEvaluacion({ ...RESUMEN, notifications_created: 0 })
    expect(texto).not.toContain('aviso')
  })

  it('usa el singular con un solo aviso pendiente', () => {
    const texto = textos.configuracion.resultadoEvaluacion({ ...RESUMEN, notifications_created: 1 })
    expect(texto).toContain('Queda 1 aviso nuevo por enviar.')
  })

  it('usa el plural con varios avisos pendientes', () => {
    const texto = textos.admin.alertasReevaluadas({ ...RESUMEN, notifications_created: 6 })
    expect(texto).toMatch(/^Las alertas se recalcularon con las mediciones nuevas\./)
    expect(texto).toContain('Quedan 6 avisos nuevos por enviar.')
  })

  it('al guardar parametros confirma las dos cosas', () => {
    expect(textos.configuracion.guardadoYReevaluado(RESUMEN)).toMatch(
      /^Parámetros guardados y alertas recalculadas\. Se registraron/,
    )
  })
})
