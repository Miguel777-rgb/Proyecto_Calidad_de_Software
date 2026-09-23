/**
 * Colores de identidad de OLA (docs/diseno.md, seccion 2).
 *
 * La web los declara en frontend/src/tema.css, porque Tailwind los necesita
 * como CSS; la app movil los lee de aqui. Una prueba de la web compara los
 * dos archivos, asi que cambiar un color en uno solo hace fallar la suite.
 *
 * Los colores de estado termico no estan aqui: su unica fuente es
 * mapa/paleta.ts.
 */
export const PALETA = {
  abisal: '#0a2530',
  'abisal-2': '#0f3849',
  'abisal-3': '#133f52',
  espuma: '#f3f7f5',
  'espuma-tenue': '#a9c1c4',
  dorado: '#e8b84b',
  'dorado-claro': '#f0c664',
  blanco: '#ffffff',
  'tinta-tenue': '#465b62',
  borde: '#d3dfdd',
  marea: '#1f6f80',
  'marea-fondo': '#e3eef0',
  realce: '#edf3f2',
  'atencion-fondo': '#fbf1d9',
  'atencion-borde': '#e2c378',
  alerta: '#b4531f',
} as const

export type ColorOla = keyof typeof PALETA
