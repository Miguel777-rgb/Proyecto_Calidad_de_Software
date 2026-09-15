import type { EstadoTermico, EstadoZona } from '../api/tipos'

/** Los cuatro estados en el orden en que se presentan. */
export const ESTADOS: EstadoTermico[] = ['warm', 'neutral', 'cold', 'no_data']

/**
 * Fecha ISO (AAAA-MM-DD) leida como fecha local. `new Date('2026-07-31')` es
 * medianoche UTC: en Peru (UTC-5) se mostraria como 30 de julio.
 */
function aFechaLocal(iso: string): Date {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

/** 31/07/2026: el formato numerico habitual en Peru. */
export function fechaCorta(iso: string): string {
  const fecha = aFechaLocal(iso)
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${fecha.getFullYear()}`
}

/** Dias de calendario entre la fecha del dato y hoy; la hora de hoy no cuenta. */
export function diasDesde(iso: string, hoy: Date): number {
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((inicioDeHoy.getTime() - aFechaLocal(iso).getTime()) / 86_400_000)
}

/**
 * Zonas con alerta vigente primero. Dentro de cada grupo se conserva el orden
 * del catalogo, que va de norte a sur como el mapa.
 */
export function ordenarZonas(zonas: EstadoZona[]): EstadoZona[] {
  return [
    ...zonas.filter((z) => z.open_alert !== null),
    ...zonas.filter((z) => z.open_alert === null),
  ]
}

/** Cuantas zonas hay en cada estado, incluidos los que no tienen ninguna. */
export function conteoPorEstado(zonas: EstadoZona[]): Record<EstadoTermico, number> {
  const conteo: Record<EstadoTermico, number> = { warm: 0, neutral: 0, cold: 0, no_data: 0 }
  for (const zona of zonas) conteo[zona.state] += 1
  return conteo
}

// Espacio duro entre el valor y la unidad: sin el, «°C» podia quedar solo en
// la linea siguiente del detalle de una zona.
const UNIDAD = ' °C'

/** «+1.58 °C», «-0.74 °C», «0.00 °C»; una raya si no hay valor. */
export function gradosConSigno(valor: string | null): string {
  if (valor === null) return '—'
  const numero = Number(valor)
  const redondeado = numero.toFixed(2)
  // Un valor que redondea a cero no lleva signo: «-0.00» o «+0.00» confunden.
  if (Number(redondeado) === 0) return `0.00${UNIDAD}`
  return `${numero > 0 ? '+' : ''}${redondeado}${UNIDAD}`
}

/**
 * «Callao», «Callao y Pisco», «Callao, Pisco y Tumbes». Antes de una palabra
 * que suena a «i» la conjuncion es «e»: «Pisco e Ilo».
 */
export function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('')
  const ultimo = nombres[nombres.length - 1]
  const sonido = ultimo.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const conjuncion = /^h?i(?![aeiou])/.test(sonido) ? 'e' : 'y'
  return `${nombres.slice(0, -1).join(', ')} ${conjuncion} ${ultimo}`
}
