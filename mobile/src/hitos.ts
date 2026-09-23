const marcados = new Set<string>()

/**
 * Deja una marca en el registro del sistema (logcat) la primera vez que la
 * app llega a un punto. scripts/medir-arranque.mjs mide el tiempo desde que
 * se toca el icono hasta la marca: es la metrica de rendimiento de la app
 * (SRS 3.3) medida en el celular real, no en una prueba simulada.
 */
export function marcarHito(nombre: string): void {
  if (marcados.has(nombre)) return
  marcados.add(nombre)
  console.info(`[ola:hito] ${nombre}`)
}

/** Solo para pruebas: permite volver a marcar entre casos. */
export function reiniciarHitos(): void {
  marcados.clear()
}
