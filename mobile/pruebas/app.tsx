import { renderRouter } from 'expo-router/testing-library'
import LayoutPestanas from '../src/app/(tabs)/_layout'
import Comparar from '../src/app/(tabs)/comparar'
import Historico from '../src/app/(tabs)/historico'
import Mapa from '../src/app/(tabs)/index'
import Proyeccion from '../src/app/(tabs)/proyeccion'
import Raiz from '../src/app/_layout'
import Avisos from '../src/app/avisos'
import Entrar from '../src/app/entrar'
import MisZonas from '../src/app/mis-zonas'
import Zona from '../src/app/zona/[code]'

/** Las rutas reales de la app, con sus layouts y pantallas. */
export const RUTAS = {
  _layout: Raiz,
  '(tabs)/_layout': LayoutPestanas,
  '(tabs)/index': Mapa,
  '(tabs)/historico': Historico,
  '(tabs)/comparar': Comparar,
  '(tabs)/proyeccion': Proyeccion,
  entrar: Entrar,
  'mis-zonas': MisZonas,
  avisos: Avisos,
  'zona/[code]': Zona,
}

/**
 * Abre la app en una ruta. Con el render asincrono de Testing Library 14, la
 * ruta actual se lee del resultado de renderRouter y no de `screen`.
 */
export async function abrir(
  initialUrl: string,
  rutas: Parameters<typeof renderRouter>[0] = RUTAS,
) {
  const app = renderRouter(rutas, { initialUrl })
  await app
  return { ruta: () => app.getPathname() }
}
