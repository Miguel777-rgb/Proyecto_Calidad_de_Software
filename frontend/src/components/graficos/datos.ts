import type { SerieLaboratorio } from '../../api/client'

export interface FilaGrafico {
  period: string
  [code: string]: string | number | null
}

/**
 * Convierte las series de la API al formato de filas que espera Recharts.
 *
 * Todas las series comparten el mismo eje temporal (el backend rellena los
 * periodos sin dato), asi que basta recorrer una para construir las filas.
 * Los periodos sin medicion quedan en `null`, que es lo que hace que la linea
 * se CORTE en lugar de unir dos puntos lejanos con una recta inventada.
 */
export function aFilasDeGrafico(series: SerieLaboratorio[]): FilaGrafico[] {
  if (series.length === 0) return []

  const periodos = series[0].points.map((p) => p.period)
  return periodos.map((period, i) => {
    const fila: FilaGrafico = { period }
    for (const serie of series) {
      const punto = serie.points[i]
      fila[serie.laboratory.code] =
        punto?.anomaly_c === null || punto?.anomaly_c === undefined
          ? null
          : Number(punto.anomaly_c)
    }
    return fila
  })
}

/** Etiqueta corta del eje segun la resolucion, para que no se amontonen. */
export function etiquetaPeriodo(period: string, resolucion: string): string {
  const [ano, mes, dia] = period.split('-')
  if (resolucion === 'monthly') return `${mes}/${ano.slice(2)}`
  if (resolucion === 'weekly') return `${dia}/${mes}`
  return `${dia}/${mes}`
}

function valoresDe(filas: FilaGrafico[], codigos: string[]): number[] {
  return filas.flatMap((f) =>
    codigos.map((c) => f[c]).filter((v): v is number => typeof v === 'number'),
  )
}

/**
 * Rango vertical.
 *
 * Siempre incluye el cero, porque la anomalia es una desviacion y el signo es
 * lo que distingue calido de frio. No se fuerza la simetria: cuando todos los
 * valores son positivos, reservar el mismo espacio para los negativos
 * desperdiciaria media grafica y aplastaria la senal.
 */
export function dominioVertical(filas: FilaGrafico[], codigos: string[]): [number, number] {
  const valores = valoresDe(filas, codigos)
  if (valores.length === 0) return [-1, 1]

  const minimo = Math.min(0, ...valores)
  const maximo = Math.max(0, ...valores)
  // Se redondea hacia afuera al medio grado para que las marcas caigan
  // en valores redondos.
  return [Math.floor((minimo - 0.25) * 2) / 2, Math.ceil((maximo + 0.25) * 2) / 2]
}

/** Marcas del eje vertical. Siempre incluyen el cero, que es la referencia
 *  que separa lo calido de lo frio. */
export function marcasVerticales([minimo, maximo]: [number, number]): number[] {
  const amplitud = maximo - minimo
  const paso = amplitud <= 3 ? 0.5 : amplitud <= 8 ? 1 : 2

  const marcas: number[] = []
  for (let v = Math.ceil(minimo / paso) * paso; v <= maximo + 1e-9; v += paso) {
    marcas.push(Number(v.toFixed(1)))
  }
  if (!marcas.includes(0) && minimo <= 0 && maximo >= 0) {
    marcas.push(0)
    marcas.sort((a, b) => a - b)
  }
  return marcas
}
