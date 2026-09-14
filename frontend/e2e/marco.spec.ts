import { expect, test, type Page } from '@playwright/test'
import { ESPERA_SESION, botonCuenta, esperarPantalla, simularSesion } from './utilidades'

const PESTANAS = ['Mapa', 'Histórico', 'Comparar', 'Próximos días']

const correoUnico = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ejemplo.pe`

async function registrarse(page: Page) {
  await page.goto('/registro')
  await page.getByLabel('Correo electrónico').fill(correoUnico())
  await page.getByLabel('Contraseña').fill('miclave123')
  await page.getByRole('button', { name: 'Registrarme' }).click()
  await expect(botonCuenta(page)).toBeVisible(ESPERA_SESION)
  await esperarPantalla(page)
}

async function sinDesbordeHorizontal(page: Page) {
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(desborde).toBe(false)
}

test.describe('Marco global — escritorio', () => {
  test.skip(({ isMobile }) => isMobile, 'Solo en escritorio')

  test('la banda muestra las cuatro pantallas y marca la actual', async ({ page }) => {
    await page.goto('/historico')
    const nav = page.getByRole('banner').getByRole('navigation', { name: 'Navegación principal' })

    await expect(nav.getByRole('link')).toHaveText(PESTANAS)
    await expect(nav.getByRole('link', { name: 'Histórico' })).toHaveAttribute('aria-current', 'page')
  })

  test('la barra inferior no aparece en escritorio', async ({ page }) => {
    await page.goto('/historico')
    await expect(page.getByTestId('barra-inferior')).toBeHidden()
  })

  test('la banda sigue visible al desplazarse por la página', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('tabla-estado').waitFor()
    await page.evaluate(() => window.scrollTo(0, 900))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    const banda = await page.getByRole('banner').boundingBox()
    expect(banda!.y).toBe(0)
  })

  test('sin sesión la banda lleva a crear una cuenta o a entrar', async ({ page }) => {
    await page.goto('/historico')
    const banda = page.getByRole('banner')

    await banda.getByRole('link', { name: 'Crear cuenta' }).click()
    await expect(page).toHaveURL(/\/registro$/)
    await banda.getByRole('link', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/entrar$/)
  })

  test('el menú de cuenta muestra la sesión y las opciones del usuario', async ({ page }) => {
    await registrarse(page)
    await botonCuenta(page).click()

    await expect(page.getByTestId('sesion-actual')).toContainText('Usuario')
    await expect(page.getByRole('link', { name: 'Mis zonas' })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Avisos/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)
  })

  test('Escape cierra el menú y devuelve el foco al botón', async ({ page }) => {
    await simularSesion(page)
    await page.goto('/historico')
    await botonCuenta(page).click()
    await expect(page.getByTestId('sesion-actual')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('sesion-actual')).toHaveCount(0)
    await expect(botonCuenta(page)).toBeFocused()
  })

  test('elegir una opción del menú lleva a su pantalla y cierra el menú', async ({ page }) => {
    await registrarse(page)
    await botonCuenta(page).click()
    await page.getByRole('link', { name: 'Mis zonas' }).click()

    await expect(page).toHaveURL(/\/mis-zonas$/)
    await expect(botonCuenta(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('los avisos sin leer se ven en el botón de cuenta y en el menú', async ({ page }) => {
    await simularSesion(page, { sinLeer: 3 })
    await page.goto('/historico')

    await expect(botonCuenta(page)).toHaveAccessibleName('Menú de cuenta, 3 avisos sin leer')
    await expect(page.getByTestId('insignia-avisos')).toHaveText('3')
    await botonCuenta(page).click()
    await expect(page.getByRole('link', { name: /^Avisos/ })).toContainText('3 sin leer')
  })

  test('lo primero al usar el teclado es saltar al contenido', async ({ page }) => {
    await page.goto('/historico')
    await page.keyboard.press('Tab')

    const salto = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(salto).toBeFocused()
    await expect(salto).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('#contenido')).toBeFocused()
  })

  test('el pie advierte que OLA no reemplaza los boletines oficiales', async ({ page }) => {
    await page.goto('/entrar')
    const pie = page.getByRole('contentinfo')

    await expect(pie).toContainText('no reemplaza los boletines del IMARPE ni del ENFEN')
    await expect(pie).toContainText('IMARPE / PRODUCE')
  })
})

test.describe('Marco global — celular', { tag: '@movil' }, () => {
  test.skip(({ isMobile }) => !isMobile, 'Solo en celular')

  test('la barra inferior muestra las cuatro pantallas y marca la actual', async ({ page }) => {
    await page.goto('/comparar')
    const barra = page.getByTestId('barra-inferior')

    await expect(barra).toBeVisible()
    await expect(barra.getByRole('link')).toHaveText(PESTANAS)
    await expect(barra.getByRole('link', { name: 'Comparar' })).toHaveAttribute('aria-current', 'page')
  })

  test('tocar una pestaña lleva a su pantalla', async ({ page }) => {
    await page.goto('/historico')
    await page.getByTestId('barra-inferior').getByRole('link', { name: 'Próximos días' }).tap()

    await expect(page).toHaveURL(/\/proyeccion$/)
    await expect(page.getByRole('heading', { name: 'Proyección de tendencia' })).toBeVisible()
  })

  test('la navegación de la banda se oculta en celular', async ({ page }) => {
    await page.goto('/historico')
    await expect(page.getByRole('banner').getByRole('navigation')).toHaveCount(0)
  })

  test('sin sesión la banda muestra «Entrar» y deja «Crear cuenta» para su pantalla', async ({
    page,
  }) => {
    await page.goto('/historico')
    const banda = page.getByRole('banner')

    await expect(banda.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect(banda.getByRole('link', { name: 'Crear cuenta' })).toBeHidden()
  })

  test('los objetivos táctiles de la barra miden al menos 44 px', async ({ page }) => {
    await page.goto('/historico')
    for (const enlace of await page.getByTestId('barra-inferior').getByRole('link').all()) {
      const caja = await enlace.boundingBox()
      expect(caja!.height).toBeGreaterThanOrEqual(44)
      expect(caja!.width).toBeGreaterThanOrEqual(44)
    }
  })

  test('la barra inferior no tapa el final de la página', async ({ page }) => {
    await page.goto('/entrar')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

    await expect(async () => {
      const pie = await page.getByTestId('atribucion').boundingBox()
      const barra = await page.getByTestId('barra-inferior').boundingBox()
      expect(pie!.y + pie!.height).toBeLessThanOrEqual(barra!.y)
    }).toPass()
  })

  test('el menú de cuenta cabe en la pantalla', async ({ page }) => {
    await simularSesion(page, { rol: 'admin', sinLeer: 2 })
    await page.goto('/historico')
    await botonCuenta(page).click()

    const menu = page.getByTestId('sesion-actual').locator('..')
    const caja = await menu.boundingBox()
    const ancho = page.viewportSize()!.width
    expect(caja!.x).toBeGreaterThanOrEqual(0)
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(ancho)
  })

  test('tocar fuera del menú lo cierra', async ({ page }) => {
    await simularSesion(page)
    await page.goto('/historico')
    await botonCuenta(page).click()
    await expect(page.getByTestId('sesion-actual')).toBeVisible()

    // Esquina inferior izquierda del contenido, lejos del menu.
    await page.touchscreen.tap(20, page.viewportSize()!.height - 160)
    await expect(botonCuenta(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('ninguna pantalla genera desplazamiento horizontal', async ({ page }) => {
    for (const ruta of ['/', '/historico', '/comparar', '/proyeccion', '/entrar', '/registro']) {
      await page.goto(ruta)
      await page.getByRole('main').waitFor()
      await sinDesbordeHorizontal(page)
    }
  })
})
