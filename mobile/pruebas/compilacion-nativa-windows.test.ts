import { conCompilacionNativa, VERSION_CMAKE } from '../plugins/compilacion-nativa-windows'

const BUILD_GRADLE = `apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
`

describe('plugin compilacion-nativa-windows', () => {
  it('va antes de expo-root-project, que evalua los modulos al aplicarse', () => {
    const resultado = conCompilacionNativa(BUILD_GRADLE)

    expect(resultado.indexOf('cmake.version')).toBeLessThan(
      resultado.indexOf('apply plugin: "expo-root-project"'),
    )
    expect(resultado.endsWith(BUILD_GRADLE)).toBe(true)
  })

  it('sin expo-root-project, lo anade al final', () => {
    const resultado = conCompilacionNativa('// otro build.gradle\n')

    expect(resultado.startsWith('// otro build.gradle\n')).toBe(true)
    expect(resultado).toContain('cmake.version')
  })

  it('usa un CMake cuyo ninja admite rutas de mas de 260 caracteres', () => {
    const resultado = conCompilacionNativa(BUILD_GRADLE)

    // ninja 1.12 llega con CMake 3.30; el 3.22.1 por defecto trae ninja 1.10.
    const [mayor, menor] = VERSION_CMAKE.split('.').map(Number)
    expect(mayor * 100 + menor).toBeGreaterThanOrEqual(330)
    expect(resultado).toContain(`externalNativeBuild.cmake.version = '${VERSION_CMAKE}'`)
    expect(resultado).toContain("'com.android.application', 'com.android.library'")
  })

  it('cada modulo compila en mobile/.cxx/<modulo>, fuera de node_modules/.pnpm y de android/', () => {
    const resultado = conCompilacionNativa(BUILD_GRADLE)

    expect(resultado).toContain('buildStagingDirectory =')
    expect(resultado).toContain('new File(rootDir, "../.cxx/${modulo.name}")')
    expect(resultado).not.toContain("if (tipo == 'com.android.library')")
  })

  it('aplicarlo dos veces no duplica el bloque', () => {
    const dos = conCompilacionNativa(conCompilacionNativa(BUILD_GRADLE))

    expect(dos.match(/cmake\.version/g)).toHaveLength(1)
  })
})
