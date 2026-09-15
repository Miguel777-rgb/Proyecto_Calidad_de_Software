import { textos } from '@ola/compartido/i18n/textos'

export function TituloInicio() {
  return (
    <h2 className="m-0 font-titulo text-[26px] leading-tight font-bold tracking-[-0.02em] text-balance lg:text-[32px]">
      {textos.estado.titulo}
    </h2>
  )
}
