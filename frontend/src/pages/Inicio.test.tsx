import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Inicio from './Inicio'
import { textos } from '../i18n/textos'
import { ESTADO_MUESTRA, ESTADO_VACIO, renderConProveedores, respuesta } from '../test-utils'

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
