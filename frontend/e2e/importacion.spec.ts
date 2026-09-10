import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@ola.pe'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''

const CABECERA = 'FECHA_MEDICION,LABORATORIO_COSTERO,ANOMALIA_TEMPERATURA'

/**
 * Las pruebas comparten la base de desarrollo, donde el equipo puede tener
 * cargado el dataset real de IMARPE (1970-2026). Para no sobrescribir ninguna
 * medicion, cada corrida inventa fechas en un ano anterior a 1970, fuera por
 * completo del rango publicado. Asi las altas siempre son nuevas y el conteo
 * de filas insertadas es predecible.
 */
function fechasFueraDelDataset(cantidad: number): string[] {
  const anio = 1900 + Math.floor(Math.random() * 60)
  const mes = 1 + Math.floor(Math.random() * 12)
  const dia = 1 + Math.floor(Math.random() * 20)
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia + i))
    return fecha.toISOString().slice(0, 10)
  })
}

function csv(...lineas: string[]): string {
  return [CABECERA, ...lineas].join('\n') + '\n'
}

async function entrarComoAdmin(page: Page) {
  await page.goto('/entrar')
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByTestId('sesion-actual')).toContainText('Administrador')
}

async function importar(page: Page, contenido: string, nombre = 'atsm.csv') {
  await page.goto('/admin')
  await page.getByLabel('Archivo CSV').setInputFiles({
    name: nombre,
    mimeType: 'text/csv',
    buffer: Buffer.from(contenido, 'utf-8'),
  })
  await page.getByRole('button', { name: 'Importar' }).click()
}

test.describe('Fase 2 — importación del dataset (RF-08)', () => {
  test.skip(ADMIN_PASSWORD === '', 'E2E_ADMIN_PASSWORD no está definida')

  test('un usuario sin sesión no llega a la administración', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('el administrador importa un CSV y ve el resumen', async ({ page }) => {
    const [d1, d2, d3] = fechasFueraDelDataset(3)
    await entrarComoAdmin(page)
    await importar(page, csv(`${d1},CALLAO,1.5`, `${d2},PISCO,-0.8`, `${d3},ILO,0.2`))

    await expect(page.getByTestId('resultado-importacion')).toBeVisible()
    await expect(page.getByTestId('filas-insertadas')).toHaveText('3')
    await expect(page.getByTestId('filas-rechazadas')).toHaveText('0')
  })

  test('reimportar el mismo archivo no vuelve a insertar', async ({ page }) => {
    const [d1, d2] = fechasFueraDelDataset(2)
    const contenido = csv(`${d1},CALLAO,1.5`, `${d2},PISCO,-0.8`)

    await entrarComoAdmin(page)
    await importar(page, contenido)
    await expect(page.getByTestId('filas-insertadas')).toHaveText('2')

    await importar(page, contenido)
    await expect(page.getByTestId('filas-insertadas')).toHaveText('0')
  })

  test('las filas inválidas se rechazan y se explican', async ({ page }) => {
    const [d1, d2] = fechasFueraDelDataset(2)
    await entrarComoAdmin(page)
    await importar(
      page,
      csv(`${d1},CALLAO,1.5`, 'fecha-mala,CALLAO,2.0', `${d2},HUANCHACO,3.0`),
    )

    await expect(page.getByTestId('filas-insertadas')).toHaveText('1')
    await expect(page.getByTestId('filas-rechazadas')).toHaveText('2')

    await page.getByTestId('detalle-errores').getByText('Ver filas rechazadas').click()
    await expect(page.getByTestId('detalle-errores')).toContainText('HUANCHACO')
  })

  test('un archivo con la cabecera equivocada se rechaza entero', async ({ page }) => {
    await entrarComoAdmin(page)
    await importar(page, 'fecha,lugar,valor\n1955-01-01,CALLAO,1.5\n')

    await expect(page.getByRole('alert')).toContainText('columnas del dataset ATSM')
  })

  test('no se puede importar un archivo que no sea CSV', async ({ page }) => {
    await entrarComoAdmin(page)
    await importar(page, csv('1955-01-01,CALLAO,1.5'), 'datos.xlsx')

    await expect(page.getByRole('alert')).toContainText('debe ser un CSV')
  })

  test('la importación queda registrada en el historial', async ({ page }) => {
    const [d1] = fechasFueraDelDataset(1)
    await entrarComoAdmin(page)
    await importar(page, csv(`${d1},CALLAO,1.5`), 'historial-e2e.csv')

    await expect(page.getByTestId('historial-importaciones')).toContainText('historial-e2e.csv')
    await expect(page.getByTestId('historial-importaciones')).toContainText(ADMIN_EMAIL)
  })

  test('el catálogo expone las 10 zonas con coordenadas', async ({ request }) => {
    const apiURL = process.env.E2E_API_URL ?? 'http://localhost:8000'
    const respuesta = await request.get(`${apiURL}/api/laboratories`)

    expect(respuesta.status()).toBe(200)
    const zonas = await respuesta.json()
    expect(zonas).toHaveLength(10)
    expect(zonas.map((z: { code: string }) => z.code)).toContain('MATARANI')
    for (const zona of zonas) {
      expect(zona.latitude).not.toBeNull()
      expect(zona.longitude).not.toBeNull()
    }
  })
})
