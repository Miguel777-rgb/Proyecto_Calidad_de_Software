import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Admin from './Admin'
import type { Importacion } from '../api/client'
import { textos } from '../i18n/textos'
import { renderConProveedores, respuesta } from '../test-utils'

const IMPORTACION: Importacion = {
  id: 1,
  filename: 'IMARPE_Anomalia_TSM.csv',
  byte_size: 3053798,
  sha256: 'a'.repeat(64),
  status: 'completed',
  rows_total: 125701,
  rows_inserted: 125701,
  rows_updated: 0,
  rows_unchanged: 0,
  rows_rejected: 0,
  error_sample: null,
  error_message: null,
  duration_ms: 11242,
  started_at: '2026-09-10T16:00:00Z',
  finished_at: '2026-09-10T16:00:11Z',
  uploaded_by_email: 'admin@ola.pe',
}

const archivoCsv = () =>
  new File(['FECHA_MEDICION,LABORATORIO_COSTERO,ANOMALIA_TEMPERATURA\n'], 'atsm.csv', {
    type: 'text/csv',
  })

/** Simula GET /imports (historial) y POST /imports (carga). */
function simularApi(alImportar: () => Response, historial: Importacion[] = []) {
  return vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? alImportar() : respuesta(historial),
  )
}

async function subirArchivo() {
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText(textos.admin.seleccionar), archivoCsv())
  await user.click(screen.getByRole('button', { name: textos.admin.boton }))
}

describe('Admin', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', simularApi(() => respuesta(IMPORTACION, 201)))
  })

  it('explica que columnas debe tener el archivo', async () => {
    renderConProveedores(<Admin />)
    expect(screen.getByText(/FECHA_MEDICION/)).toBeInTheDocument()
    // Espera a que termine la carga del historial para no dejar una
    // actualizacion de estado fuera de act().
    await screen.findByText(textos.admin.sinImportaciones)
  })

  it('no llama al servidor si no se eligio archivo', async () => {
    const fetchMock = simularApi(() => respuesta(IMPORTACION, 201))
    vi.stubGlobal('fetch', fetchMock)

    renderConProveedores(<Admin />)
    await userEvent.setup().click(screen.getByRole('button', { name: textos.admin.boton }))

    expect(await screen.findByRole('alert')).toHaveTextContent(textos.errores.archivoRequerido)
    expect(fetchMock.mock.calls.filter((c) => c[1]?.method === 'POST')).toHaveLength(0)
  })

  it('muestra el resumen con las filas cargadas', async () => {
    renderConProveedores(<Admin />)
    await subirArchivo()

    expect(await screen.findByTestId('resultado-importacion')).toBeInTheDocument()
    expect(screen.getByTestId('filas-insertadas')).toHaveTextContent('125,701')
    expect(screen.getByTestId('filas-rechazadas')).toHaveTextContent('0')
  })

  it('envia el archivo como formulario multipart', async () => {
    const fetchMock = simularApi(() => respuesta(IMPORTACION, 201))
    vi.stubGlobal('fetch', fetchMock)

    renderConProveedores(<Admin />)
    await subirArchivo()

    const envio = fetchMock.mock.calls.find((c) => c[1]?.method === 'POST')!
    expect(envio[1]!.body).toBeInstanceOf(FormData)
    // El navegador debe generar el limite del multipart: fijarlo a mano lo rompe.
    expect(envio[1]!.headers).not.toHaveProperty('Content-Type')
  })

  it('detalla las filas rechazadas cuando las hay', async () => {
    vi.stubGlobal(
      'fetch',
      simularApi(() =>
        respuesta(
          {
            ...IMPORTACION,
            rows_rejected: 2,
            error_sample: [
              { line: 3, reason: 'Fecha invalida: 31-07-2026.', content: '31-07-2026,CALLAO,1.5' },
              { line: 9, reason: 'Laboratorio costero desconocido: HUANCHACO.', content: '' },
            ],
          },
          201,
        ),
      ),
    )

    renderConProveedores(<Admin />)
    await subirArchivo()

    expect(await screen.findByTestId('detalle-errores')).toBeInTheDocument()
    expect(screen.getByText(/HUANCHACO/)).toBeInTheDocument()
  })

  it('muestra el motivo cuando el archivo completo se rechaza', async () => {
    vi.stubGlobal(
      'fetch',
      simularApi(() =>
        respuesta(
          {
            ...IMPORTACION,
            status: 'failed',
            error_message: 'El archivo no tiene las columnas del dataset ATSM.',
          },
          201,
        ),
      ),
    )

    renderConProveedores(<Admin />)
    await subirArchivo()

    expect(await screen.findByRole('alert')).toHaveTextContent('columnas del dataset ATSM')
  })

  it('avisa cuando el servidor rechaza la peticion', async () => {
    vi.stubGlobal(
      'fetch',
      simularApi(() => respuesta({ detail: 'El archivo debe ser un CSV.' }, 415)),
    )

    renderConProveedores(<Admin />)
    await subirArchivo()

    expect(await screen.findByRole('alert')).toHaveTextContent('debe ser un CSV')
  })

  it('lista el historial de importaciones', async () => {
    vi.stubGlobal(
      'fetch',
      simularApi(() => respuesta(IMPORTACION, 201), [
        IMPORTACION,
        { ...IMPORTACION, id: 2, filename: 'anterior.csv' },
      ]),
    )

    renderConProveedores(<Admin />)

    const tabla = await screen.findByTestId('historial-importaciones')
    await waitFor(() => expect(tabla).toHaveTextContent('anterior.csv'))
    expect(tabla).toHaveTextContent('admin@ola.pe')
  })

  it('avisa cuando todavia no hay importaciones', async () => {
    renderConProveedores(<Admin />)
    expect(await screen.findByText(textos.admin.sinImportaciones)).toBeInTheDocument()
  })
})
