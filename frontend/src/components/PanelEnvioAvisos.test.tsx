import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PanelEnvioAvisos } from './PanelEnvioAvisos'
import { textos } from '../i18n/textos'
import { respuesta } from '../test-utils'

function simularEnvio(resultado: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue(respuesta(resultado, status))
  vi.stubGlobal('fetch', mock)
  return mock
}

async function pulsarEnviar() {
  await userEvent.setup().click(screen.getByRole('button', { name: textos.avisos.envio.boton }))
}

describe('PanelEnvioAvisos', () => {
  it('explica por que el envio va separado de la evaluacion', () => {
    simularEnvio({})
    render(<PanelEnvioAvisos />)
    expect(screen.getByText(textos.avisos.envio.ayuda)).toBeInTheDocument()
  })

  it('resume cuantos correos salieron', async () => {
    simularEnvio({ attempted: 3, sent: 3, failed: 0, by_status: { sent: 3 } })
    render(<PanelEnvioAvisos />)
    await pulsarEnviar()

    const resumen = await screen.findByTestId('resumen-envio')
    expect(resumen).toHaveTextContent('3 envíos')
    expect(resumen).toHaveTextContent('3 correctos')
  })

  it('avisa de que los fallidos se reintentan', async () => {
    simularEnvio({ attempted: 2, sent: 1, failed: 1, by_status: { sent: 1, failed: 1 } })
    render(<PanelEnvioAvisos />)
    await pulsarEnviar()

    expect(await screen.findByTestId('resumen-envio')).toHaveTextContent(
      textos.avisos.envio.reintento,
    )
  })

  it('no menciona reintentos si no hubo fallos', async () => {
    simularEnvio({ attempted: 1, sent: 1, failed: 0, by_status: { sent: 1 } })
    render(<PanelEnvioAvisos />)
    await pulsarEnviar()

    expect(await screen.findByTestId('resumen-envio')).not.toHaveTextContent(
      textos.avisos.envio.reintento,
    )
  })

  it('informa cuando no habia nada pendiente', async () => {
    simularEnvio({ attempted: 0, sent: 0, failed: 0, by_status: {} })
    render(<PanelEnvioAvisos />)
    await pulsarEnviar()

    expect(await screen.findByTestId('resumen-envio')).toHaveTextContent(
      'No había avisos pendientes',
    )
  })

  it('muestra el mensaje del servidor si el envio se rechaza', async () => {
    simularEnvio({ detail: 'Esta accion requiere permisos de administrador.' }, 403)
    render(<PanelEnvioAvisos />)
    await pulsarEnviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('permisos de administrador')
  })
})
