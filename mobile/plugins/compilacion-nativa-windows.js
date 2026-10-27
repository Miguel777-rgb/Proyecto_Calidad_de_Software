/**
 * Plugin de Expo: deja compilar el codigo C++ de la app en Windows.
 *
 * La nueva arquitectura de React Native compila C++ de cada modulo nativo y
 * el que genera el codegen. En Windows hubo dos problemas con las rutas, que
 * pasan de 260 caracteres (ver docs/decisiones.md, 18.1):
 *
 * 1. El ninja de CMake 3.22.1, el que usa Android por defecto (ninja 1.10),
 *    no lee rutas largas: cree que sus archivos no existen. Con CMake 3.31.6
 *    llega ninja 1.12, que si las admite (Windows ya tiene activadas las
 *    rutas largas en el registro).
 * 2. Con pnpm cada modulo compila dentro de node_modules/.pnpm/<nombre>/...
 *    Aqui compila en mobile/.cxx/<modulo>, unas 60 letras mas corto; con eso
 *    CMake ya pudo ejecutar sus propios scripts .bat, que siguen limitados a
 *    260 caracteres. La app tambien compila ahi (mobile/.cxx/app): fuera de
 *    android/, lo ya compilado sobrevive a cada prebuild --clean.
 *
 * El proyecto android/ se genera de nuevo en cada compilacion, asi que el
 * cambio se aplica con este plugin y no a mano.
 */
const { withProjectBuildGradle } = require('expo/config-plugins')

const VERSION_CMAKE = '3.31.6'
const MARCA = '// OLA: compilacion C++ de los modulos nativos en Windows'

const BLOQUE = `
${MARCA} (plugins/compilacion-nativa-windows.js)
subprojects { modulo ->
  ['com.android.application', 'com.android.library'].each { tipo ->
    modulo.plugins.withId(tipo) {
      modulo.android.externalNativeBuild.cmake.version = '${VERSION_CMAKE}'
      modulo.android.externalNativeBuild.cmake.buildStagingDirectory =
        new File(rootDir, "../.cxx/\${modulo.name}")
    }
  }
}
`

const RAIZ_EXPO = 'apply plugin: "expo-root-project"'

/**
 * Anade el bloque al build.gradle raiz una sola vez, aunque se aplique de
 * nuevo. Va antes de `expo-root-project`: ese plugin evalua los modulos al
 * aplicarse, y despues Gradle ya no deja cambiar su version de CMake.
 */
function conCompilacionNativa(contenido) {
  if (contenido.includes(MARCA)) return contenido
  const posicion = contenido.indexOf(RAIZ_EXPO)
  if (posicion === -1) return contenido + BLOQUE
  return contenido.slice(0, posicion) + BLOQUE.trimStart() + '\n' + contenido.slice(posicion)
}

function compilacionNativaWindows(config) {
  return withProjectBuildGradle(config, (resultado) => {
    resultado.modResults.contents = conCompilacionNativa(resultado.modResults.contents)
    return resultado
  })
}

module.exports = compilacionNativaWindows
module.exports.conCompilacionNativa = conCompilacionNativa
module.exports.VERSION_CMAKE = VERSION_CMAKE
