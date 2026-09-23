/**
 * Compila el APK de release de una variante (ver app.config.ts).
 *
 *   pnpm compilar e2e              APK para Maestro, contra el Docker del equipo
 *   pnpm compilar demo             APK contra el VPS
 *   pnpm compilar e2e --instalar   ademas lo instala en el celular conectado
 *
 * El proyecto nativo (android/) se genera de nuevo en cada compilacion: la
 * variante cambia el paquete y los permisos de red, y mezclar restos de otra
 * variante daria un APK distinto del que dice la configuracion. android/ no
 * se versiona.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { adb, dispositivo, ejecutar, RAIZ } from './android.mjs'

const [variante, ...opciones] = process.argv.slice(2)
if (!['e2e', 'demo'].includes(variante)) {
  console.error('Uso: pnpm compilar <e2e|demo> [--instalar]')
  process.exit(1)
}

const entorno = { APP_VARIANT: variante, NODE_ENV: 'production' }

const gradle = join(RAIZ, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')

// En Windows, el daemon de Gradle de la compilacion anterior mantiene abiertos
// archivos de android/ y prebuild --clean no puede borrarlos (EBUSY).
if (existsSync(gradle)) {
  console.log('\n▸ Deteniendo el daemon de Gradle de la compilacion anterior')
  ejecutar(gradle, ['--stop'], { cwd: join(RAIZ, 'android'), tolerarFallo: true })
}

console.log(`\n▸ Generando el proyecto Android de la variante ${variante}`)
ejecutar('npx', ['expo', 'prebuild', '--platform', 'android', '--clean', '--no-install'], {
  heredar: true,
  entorno,
})

console.log('\n▸ Compilando el APK de release')
const inicio = Date.now()
ejecutar(gradle, ['assembleRelease', '--console=plain'], {
  heredar: true,
  cwd: join(RAIZ, 'android'),
  entorno,
})

const origen = join(RAIZ, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
const destino = join(RAIZ, 'informes', `ola-${variante}.apk`)
mkdirSync(join(RAIZ, 'informes'), { recursive: true })
copyFileSync(origen, destino)

const megas = (statSync(destino).size / 1024 / 1024).toFixed(1)
console.log(`\n✓ ${destino}`)
console.log(`  ${megas} MB · compilado en ${Math.round((Date.now() - inicio) / 1000)} s`)

if (opciones.includes('--instalar')) {
  console.log(`\n▸ Instalando en ${dispositivo()}`)
  console.log(adb('install', '-r', destino))
}
