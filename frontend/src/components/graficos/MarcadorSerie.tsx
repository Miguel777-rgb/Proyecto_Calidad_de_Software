import { trazadoForma, type FormaMarcador } from './paletaSeries'

interface Props {
  forma: FormaMarcador
  color: string
  tamano?: number
}

/** Marcador suelto, para la leyenda y el selector de zonas. */
export function MarcadorSerie({ forma, color, tamano = 14 }: Props) {
  const r = tamano / 2 - 1
  return (
    <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true">
      <path
        d={trazadoForma(forma, tamano / 2, tamano / 2, r)}
        fill={color}
        stroke="#ffffff"
        strokeWidth={1}
      />
    </svg>
  )
}
