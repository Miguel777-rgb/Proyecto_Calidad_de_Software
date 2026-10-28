/**
 * Configuracion de nginx de la imagen de produccion.
 *
 * nginx no hereda los add_header del server en un location que define los
 * suyos: con las cabeceras solo en el server, el index.html y /assets/ salian
 * sin ninguna. Estas pruebas fallan si alguien vuelve a dejar un location sin
 * el include de seguridad, o si cambia los mosaicos del mapa sin la CSP.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')

/** Quita los comentarios: la palabra «location» tambien aparece en ellos. */
const sinComentarios = (conf: string) => conf.replace(/#.*$/gm, '')

const NGINX = sinComentarios(leer('../nginx.conf'))
const SEGURIDAD = leer('../seguridad.conf')
const DOCKERFILE = leer('../Dockerfile')
const MAPA = leer('./components/mapa/MapaZonas.tsx')

const RUTA_SNIPPET = '/etc/nginx/snippets/seguridad.conf'
const INCLUDE = `include ${RUTA_SNIPPET};`

/** Bloques location con su contenido; en este archivo no se anidan. */
function bloques(conf: string): { nombre: string; cuerpo: string }[] {
  return [...conf.matchAll(/location\s+([^{]+)\{([^}]*)\}/g)].map((m) => ({
    nombre: m[1].trim(),
    cuerpo: m[2],
  }))
}

function directiva(csp: string, nombre: string): string[] {
  const parte = csp
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${nombre} `))
  return parte === undefined ? [] : parte.split(/\s+/).slice(1)
}

const CSP = /Content-Security-Policy "([^"]+)"/.exec(SEGURIDAD)?.[1] ?? ''

describe('cabeceras de seguridad de nginx', () => {
  it('cada location con cabeceras propias incluye las de seguridad', () => {
    const conCabeceras = bloques(NGINX).filter((b) => b.cuerpo.includes('add_header'))
    expect(conCabeceras.map((b) => b.nombre)).toEqual(['/assets/', '= /index.html'])
    for (const bloque of conCabeceras) {
      expect(bloque.cuerpo, bloque.nombre).toContain(INCLUDE)
    }
  })

  it('el server las incluye para los demas location', () => {
    const fueraDeLocation = NGINX.replace(/location\s+[^{]+\{[^}]*\}/g, '')
    expect(fueraDeLocation).toContain(INCLUDE)
  })

  it('la imagen copia el archivo donde nginx lo busca', () => {
    expect(DOCKERFILE).toContain(`COPY frontend/seguridad.conf ${RUTA_SNIPPET}`)
  })

  it.each([
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Strict-Transport-Security',
    'Content-Security-Policy',
  ])('envia %s en todas las respuestas', (cabecera) => {
    expect(SEGURIDAD).toMatch(new RegExp(`add_header ${cabecera} "[^"]+" always;`))
  })
})

describe('politica de seguridad de contenido', () => {
  it('solo ejecuta scripts del propio dominio', () => {
    expect(directiva(CSP, 'script-src')).toEqual(["'self'"])
    expect(CSP).not.toContain('unsafe-eval')
  })

  it('permite los mosaicos que pide el mapa', () => {
    const mosaicos = /const MOSAICOS = '([^']+)'/.exec(MAPA)?.[1] ?? ''
    expect(mosaicos).not.toBe('')
    expect(directiva(CSP, 'img-src')).toContain(new URL(mosaicos.replace(/\{[a-z]\}/g, '0')).origin)
  })

  it('admite las fuentes que Vite incrusta en el CSS', () => {
    // Vite convierte en data: los archivos de menos de 4 kB, como algunos
    // subconjuntos de las fuentes; sin data: el navegador los bloqueaba.
    expect(directiva(CSP, 'font-src')).toEqual(["'self'", 'data:'])
  })

  it('la API se consulta en el mismo dominio', () => {
    expect(directiva(CSP, 'connect-src')).toEqual(["'self'"])
  })

  it('no deja que otro sitio la incruste ni cambie la base de las rutas', () => {
    expect(directiva(CSP, 'frame-ancestors')).toEqual(["'self'"])
    expect(directiva(CSP, 'base-uri')).toEqual(["'self'"])
    expect(directiva(CSP, 'object-src')).toEqual(["'none'"])
  })
})
