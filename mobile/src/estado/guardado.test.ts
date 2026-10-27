import AsyncStorage from '@react-native-async-storage/async-storage'
import { ESTADO_MUESTRA } from '@ola/compartido/pruebas'
import { CONFIGURACION } from '../../pruebas/utilidades'
import { CLAVE_ESTADO, guardarEstado, leerEstadoGuardado } from './guardado'

describe('estado guardado en el celular', () => {
  it('lo que se guarda se lee igual', async () => {
    const datos = { estado: ESTADO_MUESTRA, configuracion: CONFIGURACION, guardadoEn: 1_790_000_000_000 }
    await guardarEstado(datos)

    expect(await leerEstadoGuardado()).toEqual(datos)
  })

  it('sin nada guardado devuelve null', async () => {
    expect(await leerEstadoGuardado()).toBeNull()
  })

  it('un contenido que no es JSON no rompe la app', async () => {
    await AsyncStorage.setItem(CLAVE_ESTADO, '{roto')

    expect(await leerEstadoGuardado()).toBeNull()
  })

  it.each([
    ['sin la hora de guardado', { estado: ESTADO_MUESTRA, configuracion: null }],
    ['sin zonas', { estado: { reference_date: '2026-07-31' }, configuracion: null, guardadoEn: 1 }],
    ['con una fecha que no es texto', { estado: { reference_date: 20260731, zones: [] }, guardadoEn: 1 }],
    ['con otro tipo de dato', 'texto'],
  ])('un formato distinto (%s) se ignora', async (_caso, contenido) => {
    await AsyncStorage.setItem(CLAVE_ESTADO, JSON.stringify(contenido))

    expect(await leerEstadoGuardado()).toBeNull()
  })

  it('si el almacenamiento falla, guardar no lanza error', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Sin espacio'))

    await expect(
      guardarEstado({ estado: ESTADO_MUESTRA, configuracion: null, guardadoEn: 1 }),
    ).resolves.toBeUndefined()
  })

  it('si leer falla, se abre como sin datos guardados', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Sin permiso'))

    expect(await leerEstadoGuardado()).toBeNull()
  })
})
