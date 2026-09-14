/**
 * Rejilla de Inicio. La columna minmax(0, 1fr) deja que los hijos se estrechen
 * por debajo del ancho de su contenido: sin ella, la tabla abierta en celular
 * ensanchaba toda la pagina en lugar de desplazarse dentro de su contenedor.
 *
 * Vive fuera de la pagina porque tambien la usa la espera de la carga
 * diferida (App.tsx), que no puede importar la pagina sin descargarla.
 */
export const ENVOLTURA_INICIO =
  'grid grid-cols-[minmax(0,1fr)] gap-5 text-[17px] lg:gap-6 lg:text-base'
