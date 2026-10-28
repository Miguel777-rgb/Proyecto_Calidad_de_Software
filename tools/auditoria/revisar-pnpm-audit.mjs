// Revisa la salida de `pnpm audit` contra los riesgos aceptados del equipo.
//
// La web y la app comparten un unico pnpm-lock.yaml. Este script falla con
// cualquier aviso alto o critico, de la web o de la app, que no figure en
// aceptados.json con su motivo. Ademas marca a quien afecta cada aviso
// (cruzandolo con los paquetes que instala la web) y avisa de las entradas
// aceptadas que ya no aparecen, para quitarlas.
//
// Uso: node revisar-pnpm-audit.mjs <pnpm-audit.json> <pnpm-list-web.json> [aceptados.json]
import { appendFileSync, readFileSync } from 'node:fs'

const [archivoAuditoria, archivoLista, archivoAceptados] = process.argv.slice(2)
const leerJson = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'))

const auditoria = leerJson(archivoAuditoria)
const proyectos = leerJson(archivoLista)
const aceptados = new Map(
  leerJson(archivoAceptados ?? new URL('./aceptados.json', import.meta.url)).avisos.map((a) => [
    a.ghsa,
    a,
  ]),
)

/** Paquetes (nombre@version) del arbol de produccion de los proyectos listados. */
function instalados(nodos, conjunto = new Set()) {
  for (const [nombre, dato] of Object.entries(nodos ?? {})) {
    if (dato?.version) conjunto.add(`${nombre}@${dato.version}`)
    instalados(dato?.dependencies, conjunto)
  }
  return conjunto
}

const deLaWeb = new Set()
for (const proyecto of proyectos) instalados(proyecto.dependencies, deLaWeb)

const GRAVES = new Set(['high', 'critical'])
const filas = Object.values(auditoria.advisories ?? {}).map((aviso) => {
  const versiones = (aviso.findings ?? []).map((f) => `${aviso.module_name}@${f.version}`)
  const aceptado = aceptados.get(aviso.github_advisory_id)
  return {
    ghsa: aviso.github_advisory_id,
    gravedad: aviso.severity,
    paquete: `${aviso.module_name} ${aviso.vulnerable_versions}`,
    alcance: versiones.some((v) => deLaWeb.has(v)) ? 'web' : 'app',
    estado: aceptado
      ? `aceptado: ${aceptado.motivo}`
      : GRAVES.has(aviso.severity)
        ? 'BLOQUEA'
        : 'informativo',
    url: aviso.url,
  }
})

const bloquean = filas.filter((f) => f.estado === 'BLOQUEA')
const vigentes = new Set(filas.map((f) => f.ghsa))
const sobran = [...aceptados.keys()].filter((ghsa) => !vigentes.has(ghsa))

const resumen = [
  `### Dependencias de JavaScript: ${filas.length} avisos, ${bloquean.length} bloquean`,
  '',
  'Bloquea todo aviso alto o crítico, de la web o de la app, que no esté aceptado con su motivo',
  'en tools/auditoria/aceptados.json.',
  '',
  ...(filas.length > 0
    ? [
        '| Gravedad | Paquete | Afecta a | Estado |',
        '|---|---|---|---|',
        ...filas.map((f) => `| ${f.gravedad} | [${f.paquete}](${f.url}) | ${f.alcance} | ${f.estado} |`),
      ]
    : []),
  ...(sobran.length > 0
    ? ['', `Ya no aparecen y se pueden quitar de aceptados.json: ${sobran.join(', ')}.`]
    : []),
].join('\n')

console.log(resumen)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${resumen}\n`)
process.exit(bloquean.length > 0 ? 1 : 0)
