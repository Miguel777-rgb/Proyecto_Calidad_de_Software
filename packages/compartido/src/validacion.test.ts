import { describe, expect, it } from 'vitest'
import { esCodigoValido, esCorreoValido, limpiarCodigo } from './validacion'

describe('esCorreoValido', () => {
  it.each(['pescador@ejemplo.pe', ' pescador@ejemplo.pe ', 'rosa.quispe+ola@correo.com.pe'])(
    'acepta %s',
    (correo) => {
      expect(esCorreoValido(correo)).toBe(true)
    },
  )

  it.each(['', 'pescador', 'pescador@', '@ejemplo.pe', 'pescador@ejemplo', 'pes cador@ejemplo.pe'])(
    'rechaza «%s»',
    (correo) => {
      expect(esCorreoValido(correo)).toBe(false)
    },
  )
})

describe('esCodigoValido', () => {
  it('acepta seis digitos, tambien con ceros a la izquierda', () => {
    expect(esCodigoValido('482913')).toBe(true)
    expect(esCodigoValido('000042')).toBe(true)
  })

  it.each(['48291', '4829134', '48 913', 'abcdef', ''])('rechaza «%s»', (codigo) => {
    expect(esCodigoValido(codigo)).toBe(false)
  })
})

describe('limpiarCodigo', () => {
  it('quita espacios y lo que no es digito', () => {
    expect(limpiarCodigo('482 913')).toBe('482913')
    expect(limpiarCodigo('Código: 482-913')).toBe('482913')
  })

  it('no pasa de seis digitos', () => {
    expect(limpiarCodigo('4829130')).toBe('482913')
  })
})
