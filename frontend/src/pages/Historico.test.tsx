import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Historico from './Historico'
import { textos } from '../i18n/textos'
import { LABORATORIOS, renderConProveedores, respuesta, seriesDe } from '../test-utils'

vi.mock('../components/graficos/GraficoSerie', async () => await import('../test-mocks/GraficoSerie'))

function simularApi(respuestaSeries: unknown = seriesDe('TUMBES', ['1.5', null, '2.0'])) {
  const mock = vi.fn(async (url: string) =>
    String(url).includes('/laboratories/') && String(url).includes('/readings')
      ? respuesta(respuestaSeries)
      : respuesta(LABORATORIOS),
  )
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('Historico', () => {
  it('ofrece elegir entre las zonas del catalogo', async () => {
    simularApi()
    renderConProveedores(<Historico />)

    const selector = await screen.findByLabelText(textos.graficos.zona)
    expect(selector).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(LABORATORIOS.length))
  })

  it('dibuja la serie de la zona elegida', async () => {
    simularApi()
    renderConProveedores(<Historico />)

    const grafico = await screen.findByTestId('grafico-serie')
    expect(grafico).toHaveAttribute('data-series', 'TUMBES')
  })

  it('indica con que resolucion se agruparon los datos', async () => {
    simularApi()
    renderConProveedores(<Historico />)

    expect(await screen.findByTestId('resolucion')).toHaveTextContent(
      textos.graficos.resolucion.daily,
    )
  })

  it('explica que la linea se corta donde no hay mediciones', async () => {
    simularApi()
    renderConProveedores(<Historico />)

    await screen.findByTestId('grafico-serie')
    expect(screen.getByText(new RegExp(textos.graficos.explicacionHuecos))).toBeInTheDocument()
  })

  it('cambiar de zona pide la serie de la nueva zona', async () => {
    const mock = simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Historico />)

    await screen.findByTestId('grafico-serie')
    await user.selectOptions(screen.getByLabelText(textos.graficos.zona), 'PISCO')

    await waitFor(() => {
      expect(mock.mock.calls.some((c) => String(c[0]).includes('/laboratories/PISCO/readings'))).toBe(
        true,
      )
    })
  })

  it('aplicar un rango vuelve a pedir la serie con esas fechas', async () => {
    const mock = simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Historico />)

    await screen.findByTestId('grafico-serie')
    await user.clear(screen.getByLabelText(textos.graficos.desde))
    await user.type(screen.getByLabelText(textos.graficos.desde), '2026-01-01')
    await user.click(screen.getByRole('button', { name: textos.graficos.aplicar }))

    await waitFor(() => {
      expect(mock.mock.calls.some((c) => String(c[0]).includes('from=2026-01-01'))).toBe(true)
    })
  })

  it('rechaza un rango invertido sin llamar al servidor', async () => {
    const mock = simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Historico />)

    await screen.findByTestId('grafico-serie')
    const llamadasPrevias = mock.mock.calls.length

    await user.clear(screen.getByLabelText(textos.graficos.desde))
    await user.type(screen.getByLabelText(textos.graficos.desde), '2026-12-31')
    await user.click(screen.getByRole('button', { name: textos.graficos.aplicar }))

    expect(await screen.findByRole('alert')).toHaveTextContent(textos.graficos.rangoInvertido)
    expect(mock.mock.calls).toHaveLength(llamadasPrevias)
  })

  it('avisa cuando la zona no tiene mediciones en el periodo', async () => {
    simularApi(seriesDe('MATARANI', [null, null, null]))
    renderConProveedores(<Historico />)

    expect(await screen.findByTestId('sin-datos-rango')).toBeInTheDocument()
    expect(screen.queryByTestId('grafico-serie')).not.toBeInTheDocument()
  })

  it('ofrece la tabla como alternativa accesible al grafico', async () => {
    simularApi()
    renderConProveedores(<Historico />)

    await screen.findByTestId('grafico-serie')
    expect(screen.getByText(textos.graficos.verTabla)).toBeInTheDocument()
    expect(screen.getByTestId('tabla-serie')).toBeInTheDocument()
  })

  it('la tabla omite los periodos sin dato', async () => {
    simularApi(seriesDe('TUMBES', ['1.5', null, '2.0']))
    renderConProveedores(<Historico />)

    const tabla = await screen.findByTestId('tabla-serie')
    expect(tabla.querySelectorAll('tbody tr')).toHaveLength(2)
  })
})
