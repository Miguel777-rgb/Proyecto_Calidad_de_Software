import { textos } from '../i18n/textos'

/** La SRS exige mostrar siempre la fecha del dato: es el atributo de
 *  Confiabilidad de la ISO 25010, para que nadie confunda un dato atrasado
 *  con el estado de hoy. */
export function BannerActualizacion({ fecha }: { fecha: string | null }) {
  if (fecha === null) return null
  return (
    <p className="banner-actualizacion" data-testid="fecha-referencia">
      {textos.estado.actualizado(fecha)}
    </p>
  )
}
