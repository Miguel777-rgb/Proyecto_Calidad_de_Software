import { textos } from '../../i18n/textos'

export function Pie() {
  return (
    <footer className="border-t border-borde">
      <div className="mx-auto grid max-w-[60rem] gap-1.5 px-4 pt-5 pb-6 text-[13px] text-tinta-tenue">
        <p className="m-0 max-w-[72ch] text-sm font-semibold text-abisal">{textos.app.descripcion}</p>
        <p className="m-0 max-w-[72ch]">{textos.app.avisoAlcance}</p>
        {/* La atribucion a IMARPE es obligatoria por la licencia del dataset. */}
        <p className="m-0 max-w-[72ch]" data-testid="atribucion">
          {textos.atribucion}
        </p>
      </div>
    </footer>
  )
}
