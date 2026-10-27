import { requireOptionalNativeModule } from 'expo'

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }))

function cargar() {
  let modulo!: typeof import('./index')
  jest.isolateModules(() => {
    modulo = jest.requireActual<typeof import('./index')>('./index')
  })
  return modulo
}

describe('cancelar el autocompletado', () => {
  it('llama al modulo nativo cuando existe', () => {
    const cancelar = jest.fn(() => Promise.resolve())
    jest.mocked(requireOptionalNativeModule).mockReturnValue({ cancelar })

    cargar().cancelarAutocompletado()

    expect(requireOptionalNativeModule).toHaveBeenCalledWith('OlaAutocompletado')
    expect(cancelar).toHaveBeenCalledTimes(1)
  })

  it('sin el modulo nativo no hace nada', () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null)

    expect(() => cargar().cancelarAutocompletado()).not.toThrow()
  })

  it('si Android rechaza la cancelacion, la app sigue', async () => {
    const cancelar = jest.fn(() => Promise.reject(new Error('sin actividad')))
    jest.mocked(requireOptionalNativeModule).mockReturnValue({ cancelar })

    expect(() => cargar().cancelarAutocompletado()).not.toThrow()
    await Promise.resolve()
  })
})
