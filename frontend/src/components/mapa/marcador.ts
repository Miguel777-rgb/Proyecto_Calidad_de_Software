import type { EstadoTermico, EstadoZona } from '../../api/client'
import { textos } from '../../i18n/textos'
import { COLORES } from './paleta'

// Trazos de los simbolos de lucide (arrow-up, minus, arrow-down,
// circle-dashed). El marcador de Leaflet es HTML creado fuera de React, asi
// que no puede usar los componentes; se repiten solo estos cuatro trazos.
const TRAZOS: Record<EstadoTermico, string> = {
  warm: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  neutral: '<path d="M5 12h14"/>',
  cold: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  no_data:
    '<path d="M10.1 2.182a10 10 0 0 1 3.8 0"/><path d="M13.9 21.818a10 10 0 0 1-3.8 0"/>' +
    '<path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"/><path d="M2.182 13.9a10 10 0 0 1 0-3.8"/>' +
    '<path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"/><path d="M21.818 10.1a10 10 0 0 1 0 3.8"/>' +
    '<path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"/><path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"/>',
}

const ENTIDADES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** El nombre de la zona llega de la API y se inserta como HTML: se escapa. */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (caracter) => ENTIDADES[caracter])
}

/** Nombre accesible del marcador: «Callao: cálido, en alerta». */
export function nombreMarcador(zona: EstadoZona): string {
  return textos.mapa.marcador(
    zona.laboratory.name,
    textos.estado[zona.state],
    zona.open_alert !== null,
  )
}

/**
 * Contenido del marcador: circulo del color del estado con su simbolo, y el
 * nombre para lectores de pantalla. La seleccion no va aqui sino como clase
 * del elemento: cambiar el HTML obligaria a Leaflet a recrear el marcador y el
 * foco del teclado se perderia.
 */
export function htmlMarcador(zona: EstadoZona): string {
  const grosor = zona.state === 'no_data' ? 2.2 : 3
  return (
    `<span class="marcador-zona__cuerpo" data-estado="${zona.state}" ` +
    `data-alerta="${zona.open_alert !== null}" style="--estado:${COLORES[zona.state]}">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${grosor}" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[zona.state]}</svg>` +
    `</span><span class="sr-only">${escaparHtml(nombreMarcador(zona))}</span>`
  )
}
