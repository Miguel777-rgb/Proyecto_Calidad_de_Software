import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PanelConfiguracion } from './PanelConfiguracion'
import { textos } from '../i18n/textos'
import { renderConProveedores, respuesta } from '../test-utils'

const CONFIG = {
  threshold_c: '0.5',
  min_streak_records: 5,
  max_gap_days: 2,
  freshness_days: 7,
  map_window_days: 5,
}

/** Simula GET /settings, PUT /settings y POST /alerts/evaluate. */
function simularApi(
  alGuardar: () => Response = () => respuesta(CONFIG),
  alEvaluar: () => Response = () =>
    respuesta({
      reference_date: '2026-07-31',
      laboratories_evaluated: 10,
      events_total: 4164,
      events_open: 8,
      events_removed: 0,
    }),
) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/alerts/evaluate')) return alEvaluar()
    if (init?.method === 'PUT') return alGuardar()
    return respuesta(CONFIG)
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('PanelConfiguracion', () => {
  it('carga los parametros vigentes en el formulario', async () => {
    simularApi()
    renderConProveedores(<PanelConfiguracion />)

    expect(await screen.findByLabelText(textos.configuracion.threshold_c)).toHaveValue(0.5)
    expect(screen.getByLabelText(textos.configuracion.min_streak_records)).toHaveValue(5)
    expect(screen.getByLabelText(textos.configuracion.freshness_days)).toHaveValue(7)
  })

  it('advierte que guardar no recalcula las alertas', async () => {
    simularApi()
    renderConProveedores(<PanelConfiguracion />)
    expect(await screen.findByText(textos.configuracion.ayuda)).toBeInTheDocument()
  })

  it('envia los parametros editados', async () => {
    const mock = simularApi()
    const user = userEvent.setup()
    renderConProveedores(<PanelConfiguracion />)

    const umbral = await screen.findByLabelText(textos.configuracion.threshold_c)
    await user.clear(umbral)
    await user.type(umbral, '1.2')
    await user.click(screen.getByRole('button', { name: textos.configuracion.guardar }))

    await waitFor(() => {
      const envio = mock.mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(envio).toBeDefined()
      expect(JSON.parse(envio![1]!.body as string).threshold_c).toBe('1.2')
    })
  })

  it('confirma cuando los parametros se guardan', async () => {
    simularApi()
    const user = userEvent.setup()
    renderConProveedores(<PanelConfiguracion />)

    await screen.findByLabelText(textos.configuracion.threshold_c)
    await user.click(screen.getByRole('button', { name: textos.configuracion.guardar }))

    expect(await screen.findByTestId('aviso-configuracion')).toHaveTextContent(
      textos.configuracion.guardado,
    )
  })

  it('muestra el mensaje del servidor si un valor es invalido', async () => {
    simularApi(() => respuesta({ detail: 'El umbral debe estar entre 0.1 y 5.0 grados.' }, 422))
    const user = userEvent.setup()
    renderConProveedores(<PanelConfiguracion />)

    await screen.findByLabelText(textos.configuracion.threshold_c)
    await user.click(screen.getByRole('button', { name: textos.configuracion.guardar }))

    expect(await screen.findByRole('alert')).toHaveTextContent('entre 0.1 y 5.0')
  })

  it('permite reevaluar y resume el resultado', async () => {
    simularApi()
    const user = userEvent.setup()
    renderConProveedores(<PanelConfiguracion />)

    await screen.findByLabelText(textos.configuracion.threshold_c)
    await user.click(screen.getByRole('button', { name: textos.configuracion.reevaluar }))

    const aviso = await screen.findByTestId('aviso-configuracion')
    expect(aviso).toHaveTextContent('4,164')
    expect(aviso).toHaveTextContent('8')
  })

  it('avisa si la reevaluacion falla', async () => {
    simularApi(undefined, () => respuesta({ detail: 'Esta accion requiere permisos.' }, 403))
    const user = userEvent.setup()
    renderConProveedores(<PanelConfiguracion />)

    await screen.findByLabelText(textos.configuracion.threshold_c)
    await user.click(screen.getByRole('button', { name: textos.configuracion.reevaluar }))

    expect(await screen.findByRole('alert')).toHaveTextContent('requiere permisos')
  })
})
