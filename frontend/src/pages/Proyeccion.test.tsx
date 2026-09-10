import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Proyeccion from './Proyeccion'
import { textos } from '../i18n/textos'
import { LABORATORIOS, proyeccionDe, renderConProveedores, respuesta } from '../test-utils'
import type { Proyeccion as DatosProyeccion } from '../api/client'

vi.mock(
  '../components/graficos/GraficoProyeccion',
  async () => await import('../test-mocks/GraficoProyeccion'),
)

function simularApi(datos: DatosProyeccion = proyeccionDe()) {
  const mock = vi.fn(async (url: string) =>
    String(url).includes('/projection') ? respuesta(datos) : respuesta(LABORATORIOS),
  )
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('Proyeccion', () => {
  it('advierte que es una estimacion y no un pronostico', async () => {
    // La SRS exige marcarlo explicitamente.
    simularApi()
    renderConProveedores(<Proyeccion />)

    const aviso = await screen.findByTestId('advertencia-estimacion')
    expect(aviso).toHaveTextContent('no un pronóstico')
    expect(aviso).toHaveTextContent('ENFEN')
  })

  it('muestra las dos estimaciones por separado', async () => {
    simularApi()
    renderConProveedores(<Proyeccion />)

    expect(await screen.findByTestId('valor-tendencia')).toHaveTextContent('2.20 °C')
    expect(screen.getByTestId('valor-nivel')).toHaveTextContent('1.30 °C')
  })

  it('nombra cada metodo en lenguaje sencillo', async () => {
    simularApi()
    renderConProveedores(<Proyeccion />)

    const estimaciones = await screen.findByTestId('estimaciones')
    expect(estimaciones).toHaveTextContent(textos.proyeccion.metodos.linear_regression)
    expect(estimaciones).toHaveTextContent(textos.proyeccion.metodos.weighted_moving_average)
  })

  it('avisa cuando los dos metodos difieren', async () => {
    simularApi()
    renderConProveedores(<Proyeccion />)
    expect(await screen.findByTestId('acuerdo')).toHaveTextContent('0.90')
  })

  it('destaca cuando los dos metodos coinciden', async () => {
    simularApi(proyeccionDe({ agreement_c: '0.0500' }))
    renderConProveedores(<Proyeccion />)
    expect(await screen.findByTestId('acuerdo')).toHaveTextContent(textos.proyeccion.coinciden)
  })

  it('muestra la confianza de la estimacion', async () => {
    simularApi()
    renderConProveedores(<Proyeccion />)

    const confianza = await screen.findByTestId('confianza')
    expect(confianza).toHaveTextContent(textos.proyeccion.confianzas.high)
    expect(confianza).toHaveClass('insignia--high')
  })

  it('marca la confianza baja de una zona con datos antiguos', async () => {
    simularApi(
      proyeccionDe({ confidence: 'low', days_behind: 3499, last_measured_on: '2016-12-31' }),
    )
    renderConProveedores(<Proyeccion />)

    const confianza = await screen.findByTestId('confianza')
    expect(confianza).toHaveClass('insignia--low')
    // Se formatea con separador de miles segun la configuracion de Peru.
    expect(screen.getByTestId('dato-atrasado')).toHaveTextContent('3,499')
  })

  it('no muestra el aviso de retraso cuando el dato esta al dia', async () => {
    simularApi()
    renderConProveedores(<Proyeccion />)

    await screen.findByTestId('confianza')
    expect(screen.queryByTestId('dato-atrasado')).not.toBeInTheDocument()
  })

  it('el horizonte por defecto es de cinco dias', async () => {
    const mock = simularApi()
    renderConProveedores(<Proyeccion />)

    await screen.findByTestId('confianza')
    expect(mock.mock.calls.some((c) => String(c[0]).includes('horizon=5'))).toBe(true)
  })

  it('permite cambiar el horizonte dentro del rango que admite la SRS', async () => {
    const mock = simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Proyeccion />)

    await screen.findByTestId('confianza')
    const selector = screen.getByLabelText(textos.proyeccion.horizonte)
    expect(screen.getAllByRole('option').length).toBeGreaterThan(LABORATORIOS.length)

    await user.selectOptions(selector, '7')
    await waitFor(() => {
      expect(mock.mock.calls.some((c) => String(c[0]).includes('horizon=7'))).toBe(true)
    })
  })

  it('permite cambiar de zona', async () => {
    const mock = simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Proyeccion />)

    await screen.findByTestId('confianza')
    await user.selectOptions(screen.getByLabelText(textos.graficos.zona), 'PISCO')

    await waitFor(() => {
      expect(mock.mock.calls.some((c) => String(c[0]).includes('/PISCO/projection'))).toBe(true)
    })
  })

  it('explica cuando no hay datos suficientes para estimar', async () => {
    simularApi(
      proyeccionDe({
        linear: null,
        weighted: null,
        agreement_c: null,
        unavailable_reason: 'Se necesitan al menos 3 mediciones para proyectar; hay 1.',
      }),
    )
    renderConProveedores(<Proyeccion />)

    expect(await screen.findByTestId('sin-proyeccion')).toBeInTheDocument()
    expect(screen.queryByTestId('estimaciones')).not.toBeInTheDocument()
    expect(screen.queryByTestId('grafico-proyeccion')).not.toBeInTheDocument()
  })

  it('dibuja el grafico con el tramo estimado', async () => {
    simularApi()
    renderConProveedores(<Proyeccion />)

    const grafico = await screen.findByTestId('grafico-proyeccion')
    expect(grafico).toHaveAttribute('data-puntos-estimados', '3')
  })
})
