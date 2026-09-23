import { PALETA } from '@ola/compartido/tema/colores'

/** Los mismos colores que la web (docs/diseno.md, seccion 2). */
export const color = PALETA

/** Familias incrustadas al compilar (ver app.config.ts). */
export const fuente = {
  titulo: 'SpaceGrotesk',
  cuerpo: 'Inter',
  datos: 'JetBrainsMono',
} as const

/**
 * Tamanos en sp: Android los escala con la letra que la persona eligio en su
 * celular. La escala de la web en celular, sin cambios.
 */
export const tamano = {
  tituloPantalla: 26,
  tituloSeccion: 20,
  texto: 17,
  secundario: 15,
  pie: 13,
  pestana: 12.5,
  etiqueta: 11.5,
  logotipo: 26,
} as const

/**
 * Cuanto puede crecer la letra del marco con la del celular. El contenido no
 * tiene limite; la banda y la barra si, porque a 200 % las cuatro pestanas no
 * caben en un cuarto de pantalla (aprobado con la maqueta de la fase 1).
 */
export const LETRA_MAXIMA = { banda: 1.3, barra: 1.5 } as const

export const medida = {
  banda: 56,
  pestana: 64,
  /** Objetivo tactil minimo de Android (48 dp). */
  toque: 48,
  margen: 16,
  radioTarjeta: 16,
  radioHoja: 22,
} as const
