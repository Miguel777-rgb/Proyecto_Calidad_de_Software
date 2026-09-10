import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Leaflet no puede montarse en jsdom: mide el contenedor real y usa APIs de
// dibujo que no existen fuera del navegador. El mapa autentico se prueba en
// las E2E; aqui basta con el doble.
vi.mock('react-leaflet', async () => await import('../test-mocks/react-leaflet'))
import Inicio from './Inicio'
import { textos } from '../i18n/textos'
import userEvent from '@testing-library/user-event'
import { ESTADO_MUESTRA, ESTADO_VACIO, renderConProveedores, respuesta } from '../test-utils'
import { COLORES } from '../components/mapa/paleta'

function simularApi(estado: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      String(url).includes('/settings')
        ? respuesta({ map_window_days: 5 })
        : respuesta(estado),
    ),
  )
}

describe('Inicio', () => {
  it('muestra la fecha del dato, como exige la SRS', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    expect(await screen.findByTestId('fecha-referencia')).toHaveTextContent('2026-07-31')
  })

  it('lista todas las zonas recibidas', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const tabla = await screen.findByTestId('tabla-estado')
    for (const zona of ESTADO_MUESTRA.zones) {
      expect(tabla).toHaveTextContent(zona.laboratory.name)
    }
  })

  it('traduce cada situacion al espanol', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    expect(await screen.findByTestId('situacion-CALLAO')).toHaveTextContent(textos.estado.warm)
    expect(screen.getByTestId('situacion-PISCO')).toHaveTextContent(textos.estado.cold)
    expect(screen.getByTestId('situacion-TUMBES')).toHaveTextContent(textos.estado.neutral)
  })

  it('marca la zona descontinuada como sin datos recientes', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    expect(await screen.findByTestId('situacion-MATARANI')).toHaveTextContent(
      textos.estado.no_data,
    )
    expect(screen.getByTestId('zona-MATARANI')).toHaveTextContent('2016-12-31')
  })

  it('muestra la alerta vigente con su duracion', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const alerta = await screen.findByTestId('alerta-CALLAO')
    expect(alerta).toHaveTextContent('2026-07-26')
    expect(alerta).toHaveTextContent('6')
  })

  it('una zona calida sin racha suficiente no muestra alerta', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('zona-HUACHO')
    expect(screen.queryByTestId('alerta-HUACHO')).not.toBeInTheDocument()
  })

  it('incluye la leyenda de colores', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const leyenda = await screen.findByTestId('leyenda')
    expect(leyenda).toHaveTextContent(textos.estado.no_data)
  })

  it('explica que el color sale de un promedio', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    expect(await screen.findByText(textos.estado.explicacionPromedio(5))).toBeInTheDocument()
  })

  it('avisa cuando todavia no hay mediciones cargadas', async () => {
    simularApi(ESTADO_VACIO)
    renderConProveedores(<Inicio />)

    expect(await screen.findByTestId('sin-datos')).toBeInTheDocument()
    expect(screen.queryByTestId('tabla-estado')).not.toBeInTheDocument()
  })

  it('sin datos no muestra la fecha de referencia', async () => {
    simularApi(ESTADO_VACIO)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('sin-datos')
    expect(screen.queryByTestId('fecha-referencia')).not.toBeInTheDocument()
  })
})

describe('Inicio — mapa (RF-04)', () => {
  const circulos = () => screen.getAllByTestId('mapa-circulo')

  it('dibuja un circulo por cada zona', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    expect(circulos()).toHaveLength(ESTADO_MUESTRA.zones.length)
  })

  it('colorea cada circulo segun su estado', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    const colores = circulos().map((c) => c.getAttribute('data-color'))
    expect(colores).toContain(COLORES.warm)
    expect(colores).toContain(COLORES.cold)
    expect(colores).toContain(COLORES.no_data)
  })

  it('agranda las zonas en alerta', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    const radios = circulos().map((c) => Number(c.getAttribute('data-radius')))
    // CALLAO esta en alerta; el resto no.
    expect(Math.max(...radios)).toBeGreaterThan(Math.min(...radios))
  })

  it('muestra la atribucion obligatoria de OpenStreetMap', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const mosaicos = await screen.findByTestId('mapa-mosaicos')
    expect(mosaicos.getAttribute('data-attribution')).toContain('OpenStreetMap')
  })

  it('al pulsar una zona se abre su detalle', async () => {
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    expect(screen.getByTestId('panel-zona')).toHaveTextContent(textos.mapa.sinSeleccion)

    await user.click(circulos()[0])
    expect(screen.getByRole('heading', { name: 'Callao' })).toBeInTheDocument()
    expect(screen.getByTestId('panel-alerta')).toBeInTheDocument()
  })

  it('al cerrar el detalle vuelve la invitacion a elegir zona', async () => {
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    await user.click(circulos()[0])
    await user.click(screen.getByRole('button', { name: textos.mapa.cerrarPanel }))

    expect(screen.getByTestId('panel-zona')).toHaveTextContent(textos.mapa.sinSeleccion)
  })

  it('elegir otra zona reemplaza el detalle', async () => {
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    await user.click(circulos()[0])
    await user.click(circulos()[4])

    expect(screen.getByRole('heading', { name: 'Matarani' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Callao' })).not.toBeInTheDocument()
  })

  it('mantiene la tabla como alternativa accesible al mapa', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    expect(screen.getByTestId('tabla-estado')).toBeInTheDocument()
  })

  it('sin mediciones cargadas no se dibuja el mapa', async () => {
    simularApi(ESTADO_VACIO)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('sin-datos')
    expect(screen.queryByTestId('mapa-zonas')).not.toBeInTheDocument()
  })
})
