// Clasifica los avisos de `pnpm audit` en los que afectan a la web y los demas.
//
// La web y la app comparten un unico pnpm-lock.yaml, y `pnpm audit` no se puede
// filtrar por proyecto: la app (Expo/React Native) arrastra avisos que solo se
// corrigen actualizando el SDK. Este script cruza cada aviso con los paquetes
// que instala de verdad la web (`pnpm list`) y falla solo si alguno alto o
// critico la afecta. Los demas se informan sin detener la integracion.
//
// Uso: node revisar-pnpm-audit.mjs <pnpm-audit.json> <pnpm-list-web.json>
import { appendFileSync, readFileSync } from 'node:fs'

const [archivoAuditoria, archivoLista] = process.argv.slice(2)
const auditoria = JSON.parse(readFileSync(archivoAuditoria, 'utf8'))
const proyectos = JSON.parse(readFileSync(archivoLista, 'utf8'))

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
  return {
    gravedad: aviso.severity,
    paquete: `${aviso.module_name} ${aviso.vulnerable_versions}`,
    alcance: versiones.some((v) => deLaWeb.has(v)) ? 'web' : 'app',
    titulo: aviso.title,
    url: aviso.url,
  }
})

const bloquean = filas.filter((f) => f.alcance === 'web' && GRAVES.has(f.gravedad))
const tabla = [
  '| Gravedad | Paquete | Afecta a | Aviso |',
  '|---|---|---|---|',
  ...filas.map((f) => `| ${f.gravedad} | ${f.paquete} | ${f.alcance} | [${f.titulo}](${f.url}) |`),
].join('\n')

const resumen = [
  `### Dependencias de JavaScript: ${filas.length} avisos`,
  '',
  `Afectan a la web: ${filas.filter((f) => f.alcance === 'web').length}; altos o críticos: ${bloquean.length}.`,
  'Los de la app se corrigen actualizando el SDK de Expo y no detienen la integración.',
  '',
  filas.length > 0 ? tabla : '',
].join('\n')

console.log(resumen)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${resumen}\n`)
process.exit(bloquean.length > 0 ? 1 : 0)
