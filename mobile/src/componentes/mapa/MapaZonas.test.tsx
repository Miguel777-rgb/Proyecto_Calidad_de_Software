import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { EstadoZona } from '@ola/compartido/api'
import { ESTADO_MUESTRA, LABORATORIOS } from '@ola/compartido/pruebas'
import { camaraSimulada, mapaSimulado } from '../../../pruebas/simulaciones/maplibre'
import { DURACION_AVISO, encuadreDe, MapaZonas } from './MapaZonas'

/** Las zonas de muestra, cada una en su lugar del catalogo. */
const ZONAS: EstadoZona[] = ESTADO_MUESTRA.zones.map((zona) => ({
  ...zona,
  laboratory: LABORATORIOS.find((l) => l.code === zona.laboratory.code)!,
}))

function toque(x: number, y: number) {
  return { pageX: x, pageY: y }
}

async function dibujar(props: Partial<Parameters<typeof MapaZonas>[0]> = {}) {
  await render(<MapaZonas zonas={ZONAS} seleccionada={null} alElegir={jest.fn()} {...props} />)
}

beforeEach(() => {
  camaraSimulada.fitBounds.mockClear()
  mapaSimulado.project.mockClear()
})

describe('encuadreDe', () => {
  it('cubre todas las zonas con margen, en el orden de MapLibre', () => {
    const [oeste, sur, este, norte] = encuadreDe(ZONAS)!
    const latitudes = ZONAS.map((z) => Number(z.laboratory.latitude))

    expect(sur).toBeCloseTo(Math.min(...latitudes) - 1.5)
    expect(norte).toBeCloseTo(Math.max(...latitudes) + 1.5)
    expect(oeste).toBeLessThan(este)
  })

  it('sin zonas no hay encuadre', () => {
    expect(encuadreDe([])).toBeNull()
  })
})

describe('MapaZonas', () => {
  it('abre con el encuadre de toda la costa', async () => {
    await dibujar()

    expect(screen.getByTestId('maplibre-camara').props.initialViewState).toEqual({
      bounds: encuadreDe(ZONAS),
    })
  })

  it('un dedo no mueve el mapa: el arrastre queda para la pantalla', async () => {
    await dibujar()

    expect(screen.getByTestId('maplibre-mapa').props).toMatchObject({
      dragPan: false,
      touchRotate: false,
      touchPitch: false,
    })
  })

  it('pone cada zona en su coordenada', async () => {
    await dibujar()

    expect(screen.getByTestId('maplibre-marcador-CALLAO').props.lngLat).toEqual([
      Number(LABORATORIOS.find((l) => l.code === 'CALLAO')!.longitude),
      Number(LABORATORIOS.find((l) => l.code === 'CALLAO')!.latitude),
    ])
  })

  it('cada marcador es un boton con el nombre y la situacion de la zona', async () => {
    await dibujar()

    expect(await screen.findByRole('button', { name: 'Callao: cálido, en alerta' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Huacho: cálido' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Matarani: sin datos recientes' })).toBeOnTheScreen()
  })

  it('las zonas en alerta se dibujan al final, encima de sus vecinas', async () => {
    await dibujar()

    const orden = screen
      .getAllByTestId(/^maplibre-marcador-/)
      .map((m) => m.props.testID.replace('maplibre-marcador-', ''))
    expect(orden.at(-1)).toBe('CALLAO')
  })

  it('el dibujo que pinta MapLibre no se duplica para TalkBack: un boton por zona', async () => {
    await dibujar()

    await screen.findByRole('button', { name: 'Callao: cálido, en alerta' })
    expect(screen.getAllByRole('button')).toHaveLength(ZONAS.length)
  })

  it('cada boton queda centrado sobre su zona, con 48 dp de area tactil', async () => {
    await dibujar()

    const [x, y] = await mapaSimulado.project([
      Number(LABORATORIOS.find((l) => l.code === 'PISCO')!.longitude),
      Number(LABORATORIOS.find((l) => l.code === 'PISCO')!.latitude),
    ])
    expect(await screen.findByTestId('marcador-PISCO')).toHaveStyle({
      left: x - 24,
      top: y - 24,
      width: 48,
      height: 48,
    })
  })

  it('una zona que queda fuera del mapa no tiene boton', async () => {
    await dibujar()
    await screen.findByTestId('marcador-TUMBES')

    await fireEvent(screen.getByTestId('mapa-zonas'), 'layout', {
      nativeEvent: { layout: { width: 352, height: 150 } },
    })

    expect(screen.getByTestId('marcador-TUMBES')).toBeOnTheScreen()
    expect(screen.queryByTestId('marcador-MATARANI')).toBeNull()
  })

  it('mientras la persona mueve el mapa quita los botones y al terminar los vuelve a ubicar', async () => {
    await dibujar()
    await screen.findByTestId('marcador-PISCO')
    const mapa = screen.getByTestId('maplibre-mapa')

    await fireEvent(mapa, 'regionWillChange', { nativeEvent: { userInteraction: true } })
    expect(screen.queryByTestId('marcador-PISCO')).toBeNull()

    mapaSimulado.project.mockClear()
    await fireEvent(mapa, 'regionDidChange', { nativeEvent: { userInteraction: true } })

    expect(await screen.findByTestId('marcador-PISCO')).toBeOnTheScreen()
    expect(mapaSimulado.project).toHaveBeenCalledTimes(ZONAS.length)
  })

  it('un cambio del encuadre que no hizo la persona no quita los botones', async () => {
    await dibujar()
    await screen.findByTestId('marcador-PISCO')

    await fireEvent(screen.getByTestId('maplibre-mapa'), 'regionWillChange', {
      nativeEvent: { userInteraction: false },
    })

    expect(screen.getByTestId('marcador-PISCO')).toBeOnTheScreen()
  })

  it('tocar un marcador elige su zona', async () => {
    const alElegir = jest.fn()
    await dibujar({ alElegir })

    await fireEvent.press(await screen.findByRole('button', { name: 'Pisco: frío' }))

    expect(alElegir).toHaveBeenCalledWith('PISCO')
  })

  it('la zona elegida queda marcada como seleccionada', async () => {
    await dibujar({ seleccionada: 'PISCO' })

    expect(await screen.findByRole('button', { name: 'Pisco: frío' })).toBeSelected()
    expect(screen.getByRole('button', { name: 'Huacho: cálido' })).not.toBeSelected()
  })

  it('avisa una sola vez, cuando los marcadores ya estan en su lugar', async () => {
    const alDibujar = jest.fn()
    await dibujar({ alDibujar })

    await waitFor(() => expect(alDibujar).toHaveBeenCalledTimes(1))
    await fireEvent(screen.getByTestId('maplibre-mapa'), 'didFinishRenderingFrame')
    await fireEvent(screen.getByTestId('maplibre-mapa'), 'regionDidChange', {
      nativeEvent: { userInteraction: false },
    })

    await screen.findByTestId('marcador-PISCO')
    expect(alDibujar).toHaveBeenCalledTimes(1)
  })

  describe('aviso de gestos', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('arrastrar con un dedo explica que se usan dos, y el aviso se va solo', async () => {
      await dibujar()
      const mapa = screen.getByTestId('mapa-zonas')

      await fireEvent(mapa, 'touchStart', { nativeEvent: { touches: [toque(100, 100)] } })
      await fireEvent(mapa, 'touchMove', { nativeEvent: { touches: [toque(100, 120)] } })

      expect(screen.getByTestId('aviso-gesto')).toHaveTextContent('Usa dos dedos para mover el mapa')

      await act(async () => jest.advanceTimersByTime(DURACION_AVISO))
      expect(screen.queryByTestId('aviso-gesto')).toBeNull()
    })

    it('tocar sin arrastrar no muestra el aviso', async () => {
      await dibujar()
      const mapa = screen.getByTestId('mapa-zonas')

      await fireEvent(mapa, 'touchStart', { nativeEvent: { touches: [toque(100, 100)] } })
      await fireEvent(mapa, 'touchMove', { nativeEvent: { touches: [toque(101, 101)] } })

      expect(screen.queryByTestId('aviso-gesto')).toBeNull()
    })

    it('con dos dedos no hay aviso', async () => {
      await dibujar()
      const mapa = screen.getByTestId('mapa-zonas')
      const dos = [toque(100, 100), toque(200, 200)]

      await fireEvent(mapa, 'touchStart', { nativeEvent: { touches: dos } })
      await fireEvent(mapa, 'touchMove', {
        nativeEvent: { touches: [toque(80, 80), toque(220, 220)] },
      })

      expect(screen.queryByTestId('aviso-gesto')).toBeNull()
    })

    it('si al arrastrar se suma un segundo dedo, ya no avisa', async () => {
      await dibujar()
      const mapa = screen.getByTestId('mapa-zonas')

      await fireEvent(mapa, 'touchStart', { nativeEvent: { touches: [toque(100, 100)] } })
      await fireEvent(mapa, 'touchMove', {
        nativeEvent: { touches: [toque(100, 101), toque(200, 200)] },
      })
      await fireEvent(mapa, 'touchMove', { nativeEvent: { touches: [toque(100, 140)] } })

      expect(screen.queryByTestId('aviso-gesto')).toBeNull()
    })
  })

  describe('volver al encuadre', () => {
    it('aparece solo cuando la persona movio el mapa', async () => {
      await dibujar()
      const mapa = screen.getByTestId('maplibre-mapa')

      await fireEvent(mapa, 'regionDidChange', { nativeEvent: { userInteraction: false } })
      expect(screen.queryByRole('button', { name: 'Ver toda la costa' })).toBeNull()

      await fireEvent(mapa, 'regionDidChange', { nativeEvent: { userInteraction: true } })
      expect(screen.getByRole('button', { name: 'Ver toda la costa' })).toBeOnTheScreen()
    })

    it('vuelve a mostrar toda la costa y se oculta', async () => {
      await dibujar()
      await fireEvent(screen.getByTestId('maplibre-mapa'), 'regionDidChange', {
        nativeEvent: { userInteraction: true },
      })

      await fireEvent.press(screen.getByRole('button', { name: 'Ver toda la costa' }))

      expect(camaraSimulada.fitBounds).toHaveBeenCalledWith(encuadreDe(ZONAS), { duration: 400 })
      expect(screen.queryByRole('button', { name: 'Ver toda la costa' })).toBeNull()
    })
  })

  it('atribuye el mapa base, con un texto completo para TalkBack', async () => {
    await dibujar()

    expect(screen.getByText('OpenFreeMap © OpenMapTiles · © OpenStreetMap')).toBeOnTheScreen()
    expect(
      screen.getByLabelText(
        'Mapa base: OpenFreeMap, con datos de OpenMapTiles y de los colaboradores de OpenStreetMap.',
      ),
    ).toBeOnTheScreen()
  })

  it('sin zonas no dibuja el mapa', async () => {
    await dibujar({ zonas: [] })

    expect(screen.queryByTestId('mapa-zonas')).toBeNull()
  })
})
