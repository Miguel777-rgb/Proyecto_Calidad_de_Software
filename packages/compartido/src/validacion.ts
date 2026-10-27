/**
 * Validaciones de los formularios de cuenta, iguales en la web y en la app.
 * Responden al instante y en espanol, antes de llamar a la API; el backend
 * vuelve a validar todo.
 */

/** Minimo de la contrasena, el mismo que exige el backend (RF-07). */
export { CONTRASENA_MIN_LENGTH } from './i18n/textos'

/**
 * Un correo con la forma nombre@dominio.ext. No pretende cubrir todo lo que
 * admite el estandar: solo atrapar los errores de tipeo mas comunes.
 */
export function esCorreoValido(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim())
}

/** Seis digitos, sin espacios: el codigo para recuperar la contrasena. */
export function esCodigoValido(texto: string): boolean {
  return /^[0-9]{6}$/.test(texto)
}

/** Deja solo los digitos, hasta seis: lo que se pega desde el correo puede traer espacios. */
export function limpiarCodigo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, 6)
}
