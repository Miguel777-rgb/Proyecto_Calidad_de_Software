import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Comparacion from './Comparacion'
import { MAX_SERIES } from '../components/graficos/paletaSeries'
import { textos } from '../i18n/textos'
import { LABORATORIOS, renderConProveedores, respuesta, seriesDe } from '../test-utils'

vi.mock('../components/graficos/GraficoSerie', async () => await import('../test-mocks/GraficoSerie'))

/** Devuelve las series que se le piden, para que el grafico refleje la
 *  seleccion real en lugar de una respuesta fija. */
function simularApi(fallo?: { detail: string; status: number }) {
  const mock = vi.fn(async (url: string) => {
    const ruta = String(url)
    if (!ruta.includes('/readings/compare')) return respuesta(LABORATORIOS)
    if (fallo) return respuesta({ detail: fallo.detail }, fallo.status)
    const codigos = new URL(`http://x${ruta}`).searchParams.get('labs')!.split(',')
    return respuesta(seriesDe(codigos, ['1.5', null, '2.0']))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

const chip = (nombre: string) => screen.getByRole('button', { name: new RegExp(nombre) })

describe('Comparacion', () => {
  it('empieza comparando dos zonas', async () => {
    simularApi()
    renderConProveedores(<Comparacion />)

    const grafico = await screen.findByTestId('grafico-serie')
    expect(grafico.getAttribute('data-series')?.split(',')).toHaveLength(2)
  })

  it('ofrece todas las zonas del catalogo', async () => {
    simularApi()
    renderConProveedores(<Comparacion />)

    const selector = await screen.findByTestId('selector-zonas')
    for (const lab of LABORATORIOS) {
      expect(selector).toHaveTextContent(lab.name)
    }
  })

  it('anade una zona a la comparacion', async () => {
    simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Comparacion />)

    await screen.findByTestId('grafico-serie')
    await user.click(chip('Callao'))

    await waitFor(() => {
      expect(screen.getByTestId('grafico-serie').getAttribute('data-series')).toContain('CALLAO')
    })
  })

  it('quita una zona ya elegida', async () => {
    simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Comparacion />)

    await screen.findByTestId('grafico-serie')
    await user.click(chip('Tumbes'))

    await waitFor(() => {
      expect(screen.getByTestId('grafico-serie').getAttribute('data-series')).not.toContain(
        'TUMBES',
      )
    })
  })

  it('marca las zonas elegidas para lectores de pantalla', async () => {
    simularApi()
    renderConProveedores(<Comparacion />)

    await screen.findByTestId('grafico-serie')
    expect(chip('Tumbes')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Callao')).toHaveAttribute('aria-pressed', 'false')
  })

  it(`no deja superponer mas de ${MAX_SERIES} zonas`, async () => {
    simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Comparacion />)

    await screen.findByTestId('grafico-serie')
    for (const nombre of ['San José', 'Chicama', 'Chimbote']) {
      await user.click(chip(nombre))
    }

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textos.graficos.limiteZonas(MAX_SERIES),
    )
    await waitFor(() => {
      expect(
        screen.getByTestId('grafico-serie').getAttribute('data-series')?.split(','),
      ).toHaveLength(MAX_SERIES)
    })
  })

  it('avisa cuando no queda ninguna zona elegida', async () => {
    simularApi()
    const user = userEvent.setup()
    renderConProveedores(<Comparacion />)

    await screen.findByTestId('grafico-serie')
    await user.click(chip('Tumbes'))
    await user.click(chip('Paita'))

    expect(await screen.findByTestId('ninguna-zona')).toBeInTheDocument()
  })

  it('muestra la leyenda, obligatoria con dos o mas series', async () => {
    simularApi()
    renderConProveedores(<Comparacion />)

    const leyenda = await screen.findByTestId('leyenda-series')
    expect(leyenda).toHaveTextContent('Tumbes')
    expect(leyenda).toHaveTextContent('Paita')
  })

  it('cada serie de la leyenda lleva su propia forma, no solo color', async () => {
    simularApi()
    renderConProveedores(<Comparacion />)

    const leyenda = await screen.findByTestId('leyenda-series')
    const formas = [...leyenda.querySelectorAll('path')].map((p) => p.getAttribute('d'))
    expect(new Set(formas).size).toBe(formas.length)
  })

  it('ofrece la tabla como alternativa accesible', async () => {
    simularApi()
    renderConProveedores(<Comparacion />)

    await screen.findByTestId('grafico-serie')
    expect(screen.getByTestId('tabla-serie')).toBeInTheDocument()
  })

  it('muestra el mensaje del servidor si la comparacion falla', async () => {
    simularApi({ detail: 'Se pueden comparar hasta 4 zonas a la vez.', status: 422 })
    renderConProveedores(<Comparacion />)

    expect(await screen.findByRole('alert')).toHaveTextContent('hasta 4 zonas')
  })
})
