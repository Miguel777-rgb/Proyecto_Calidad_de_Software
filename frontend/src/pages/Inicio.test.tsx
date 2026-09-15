import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Leaflet no puede montarse en jsdom: mide el contenedor real y usa APIs de
// dibujo que no existen fuera del navegador. El mapa autentico se prueba en
// las E2E; aqui basta con el doble.
vi.mock('react-leaflet', async () => await import('../test-mocks/react-leaflet'))
import Inicio from './Inicio'
import type { EstadoSistema } from '../api/client'
import { COLORES } from '@ola/compartido/mapa/paleta'
import { ESCRITORIO } from '../hooks/useMediaQuery'
import { textos } from '@ola/compartido/i18n/textos'
import { ESTADO_MUESTRA, ESTADO_VACIO, renderConProveedores, respuesta } from '../test-utils'

function simularApi(estado: unknown) {
  const mock = vi.fn(async (url: string) =>
    String(url).includes('/settings') ? respuesta({ map_window_days: 5 }) : respuesta(estado),
  )
  vi.stubGlobal('fetch', mock)
  return mock
}

function simularEscritorio() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((consulta: string) => ({
      matches: consulta === ESCRITORIO,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

/** Muestra con una segunda alerta, fria y en una zona que no va primera. */
const CON_ALERTA_EN_PISCO: EstadoSistema = {
  ...ESTADO_MUESTRA,
  zones: ESTADO_MUESTRA.zones.map((z) =>
    z.laboratory.code === 'PISCO'
      ? {
          ...z,
          open_alert: {
            id: 2,
            state: 'cold',
            started_on: '2026-07-28',
            streak_length: 5,
            peak_anomaly_c: '-1.5000',
          },
        }
      : z,
  ),
}

const hoja = (zona: string) => screen.findByRole('dialog', { name: textos.mapa.detalleDe(zona) })

afterEach(() => {
  vi.useRealTimers()
})

describe('Inicio — resumen', () => {
  it('muestra la fecha del dato como dd/mm/aaaa, como exige la SRS', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    expect(await screen.findByTestId('fecha-referencia')).toHaveTextContent('31/07/2026')
  })

  it('indica la antiguedad del dato y la resalta si supera la vigencia', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 14, 12))
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const antiguedad = await screen.findByTestId('antiguedad-dato')
    expect(antiguedad).toHaveTextContent('hace 45 días')
    expect(antiguedad).toHaveAttribute('data-atrasado', 'true')
  })

  it('nombra las zonas en alerta', async () => {
    simularApi(CON_ALERTA_EN_PISCO)
    renderConProveedores(<Inicio />)

    expect(await screen.findByTestId('resumen-alertas')).toHaveTextContent(
      'Callao (cálida) y Pisco (fría)',
    )
  })

  it('el conteo por estado hace de leyenda', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const leyenda = await screen.findByTestId('leyenda')
    expect(leyenda).toHaveTextContent('2 cálidas')
    expect(leyenda).toHaveTextContent(textos.estado.plural.no_data)
  })

  it('explica que el color sale de un promedio', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    expect(await screen.findByText(textos.estado.explicacionPromedio(5))).toBeInTheDocument()
  })
})

describe('Inicio — carga, errores y ausencia de datos', () => {
  it('mientras carga muestra un esqueleto anunciado a lectores de pantalla', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderConProveedores(<Inicio />)

    expect(screen.getByRole('status', { name: textos.estado.cargando })).toBeInTheDocument()
  })

  it('si falla la carga ofrece reintentar y vuelve a pedir el estado', async () => {
    let fallar = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/settings')) return respuesta({ map_window_days: 5 })
        return fallar ? respuesta({ detail: 'Error interno' }, 500) : respuesta(ESTADO_MUESTRA)
      }),
    )
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    expect(await screen.findByRole('alert')).toHaveTextContent(textos.estado.errorCarga)
    fallar = false
    await user.click(screen.getByRole('button', { name: textos.estado.reintentar }))

    expect(await screen.findByTestId('fecha-referencia')).toHaveTextContent('31/07/2026')
  })

  it('avisa cuando todavia no hay mediciones cargadas', async () => {
    simularApi(ESTADO_VACIO)
    renderConProveedores(<Inicio />)

    expect(await screen.findByTestId('sin-datos')).toHaveTextContent(textos.estado.sinDatosCargados)
    expect(screen.queryByTestId('tabla-estado')).not.toBeInTheDocument()
  })

  it('sin datos no muestra la fecha de referencia ni el mapa', async () => {
    simularApi(ESTADO_VACIO)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('sin-datos')
    expect(screen.queryByTestId('fecha-referencia')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mapa-zonas')).not.toBeInTheDocument()
  })
})

describe('Inicio — tabla', () => {
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
    expect(screen.getByTestId('zona-MATARANI')).toHaveTextContent('31/12/2016')
  })

  it('muestra la alerta vigente con su duracion', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const alerta = await screen.findByTestId('alerta-CALLAO')
    expect(alerta).toHaveTextContent('26/07/2026')
    expect(alerta).toHaveTextContent('6 mediciones')
  })

  it('una zona calida sin racha suficiente no muestra alerta', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('zona-HUACHO')
    expect(screen.queryByTestId('alerta-HUACHO')).not.toBeInTheDocument()
  })
})

describe('Inicio — celular', () => {
  it('muestra una tarjeta por zona con las alertas primero', async () => {
    simularApi(CON_ALERTA_EN_PISCO)
    renderConProveedores(<Inicio />)

    const lista = await screen.findByTestId('tarjetas-zonas')
    const orden = within(lista)
      .getAllByRole('button')
      .map((b) => b.getAttribute('data-testid'))
    expect(orden).toEqual([
      'tarjeta-CALLAO',
      'tarjeta-PISCO',
      'tarjeta-HUACHO',
      'tarjeta-TUMBES',
      'tarjeta-MATARANI',
    ])
  })

  it('la tabla completa queda dentro de «Ver todos los datos»', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const tabla = await screen.findByTestId('tabla-estado')
    const desplegable = tabla.closest('details')
    expect(desplegable).not.toBeNull()
    expect(desplegable).not.toHaveAttribute('open')
    expect(within(desplegable!).getByText(textos.estado.verTodosLosDatos)).toBeInTheDocument()
  })

  it('no hay panel lateral: el detalle se abre en la hoja inferior', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    expect(screen.queryByTestId('panel-zona')).not.toBeInTheDocument()
  })

  it('tocar una tarjeta abre el detalle en la hoja y tocarla otra vez lo cierra', async () => {
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    const tarjeta = await screen.findByTestId('tarjeta-HUACHO')
    await user.click(tarjeta)
    expect(within(await hoja('Huacho')).getByRole('heading', { name: 'Huacho' })).toBeInTheDocument()
    expect(tarjeta).toHaveAttribute('aria-pressed', 'true')

    await user.click(tarjeta)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('la zona indicada en la direccion se abre al cargar', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />, { ruta: '/?zona=PISCO' })

    expect(within(await hoja('Pisco')).getByRole('heading', { name: 'Pisco' })).toBeInTheDocument()
  })

  it('una zona desconocida en la direccion no abre nada', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />, { ruta: '/?zona=NO-EXISTE' })

    await screen.findByTestId('mapa-zonas')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Inicio — escritorio', () => {
  it('muestra la tabla como vista principal y no las tarjetas', async () => {
    simularEscritorio()
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const tabla = await screen.findByTestId('tabla-estado')
    expect(tabla.closest('details')).toBeNull()
    expect(screen.getByRole('heading', { name: textos.estado.todasLasZonas })).toBeInTheDocument()
    expect(screen.queryByTestId('tarjetas-zonas')).not.toBeInTheDocument()
  })

  it('el panel lateral invita a elegir y da acceso a las zonas en alerta', async () => {
    simularEscritorio()
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    const panel = await screen.findByTestId('panel-zona')
    expect(panel).toHaveTextContent(textos.mapa.sinSeleccion)

    await user.click(within(screen.getByTestId('accesos-alerta')).getByRole('button', { name: 'Callao' }))
    expect(within(screen.getByTestId('panel-zona')).getByRole('heading', { name: 'Callao' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('elegir una zona en la tabla abre su detalle en el panel', async () => {
    simularEscritorio()
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    const fila = await screen.findByTestId('zona-PISCO')
    await user.click(within(fila).getByRole('button', { name: 'Pisco' }))

    await waitFor(() =>
      expect(
        within(screen.getByTestId('panel-zona')).getByRole('heading', { name: 'Pisco' }),
      ).toBeInTheDocument(),
    )
  })

  it('los marcadores llevan el nombre de la zona visible', async () => {
    simularEscritorio()
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    expect(screen.getAllByTestId('mapa-etiqueta').map((e) => e.textContent)).toEqual(
      ESTADO_MUESTRA.zones.map((z) => z.laboratory.name),
    )
  })
})

describe('Inicio — mapa (RF-04)', () => {
  const marcadores = () => screen.getAllByTestId('mapa-marcador')

  it('dibuja un marcador por cada zona', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    expect(marcadores()).toHaveLength(ESTADO_MUESTRA.zones.length)
  })

  it('pinta cada marcador con el color de su estado', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    const contenido = marcadores().map((m) => m.getAttribute('data-html')).join('')
    expect(contenido).toContain(COLORES.warm)
    expect(contenido).toContain(COLORES.cold)
    expect(contenido).toContain(COLORES.no_data)
  })

  it('destaca solo las zonas en alerta', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    const enAlerta = marcadores().filter((m) =>
      m.getAttribute('data-html')?.includes('data-alerta="true"'),
    )
    // CALLAO esta en alerta; el resto no.
    expect(enAlerta).toHaveLength(1)
  })

  it('en celular no muestra los nombres fijos en el mapa', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    expect(screen.queryByTestId('mapa-etiqueta')).not.toBeInTheDocument()
  })

  it('atribuye el mapa base a OpenStreetMap, como exige su licencia', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    const mosaicos = await screen.findByTestId('mapa-mosaicos')
    expect(mosaicos.getAttribute('data-attribution')).toContain('OpenStreetMap')
    expect(screen.getByText(textos.mapa.atribucionMapa)).toBeInTheDocument()
  })

  it('al pulsar una zona se abre su detalle', async () => {
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    await user.click(marcadores()[0])

    const dialogo = await hoja('Callao')
    expect(within(dialogo).getByTestId('panel-alerta')).toBeInTheDocument()
  })

  it('al cerrar el detalle desaparece la hoja', async () => {
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    await user.click(marcadores()[0])
    await user.click(within(await hoja('Callao')).getByRole('button', { name: textos.mapa.cerrarPanel }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('una zona sin datos recientes lo explica en su detalle', async () => {
    simularApi(ESTADO_MUESTRA)
    const user = userEvent.setup()
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    await user.click(marcadores()[4])

    expect(within(await hoja('Matarani')).getByTestId('panel-obsoleta')).toBeInTheDocument()
  })

  it('mantiene la tabla como alternativa accesible al mapa', async () => {
    simularApi(ESTADO_MUESTRA)
    renderConProveedores(<Inicio />)

    await screen.findByTestId('mapa-zonas')
    expect(screen.getByTestId('tabla-estado')).toBeInTheDocument()
  })
})
