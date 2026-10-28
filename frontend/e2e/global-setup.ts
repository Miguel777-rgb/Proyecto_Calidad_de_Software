import { chromium, request, type APIRequestContext, type FullConfig } from '@playwright/test'

/**
 * Ultimo dia del dataset del repositorio. De el parten el rango por defecto de
 * los graficos y las capturas de referencia.
 */
const ULTIMO_DIA_DATASET = '2026-07-31'
const CARGAR_DATASET =
  'docker compose exec api python -m ola.jobs import-file /dataset/IMARPE_Anomalia_TSM.csv'

/**
 * Comprueba, sin escribir nada, que la base tiene los datos reales de los que
 * dependen los graficos, la proyeccion y los avisos. Sin ellos, decenas de
 * pruebas agotarian su tiempo sin decir por que. E2E_SIN_DATOS=1 la salta,
 * para correr a proposito solo pruebas que no usan mediciones.
 */
async function comprobarDatos(api: APIRequestContext, apiURL: string): Promise<void> {
  if (process.env.E2E_SIN_DATOS === '1') return
  const respuesta = await api.get(`${apiURL}/api/status`)
  if (!respuesta.ok()) throw new Error(`GET /api/status respondió ${respuesta.status()}.`)
  const { reference_date: ultimoDia } = (await respuesta.json()) as {
    reference_date: string | null
  }
  // Vacia, o solo con las filas de 1900-1959 que deja importacion.spec.ts.
  if (ultimoDia === null || ultimoDia < ULTIMO_DIA_DATASET) {
    throw new Error(
      `La base no tiene el dataset de IMARPE (último dato: ${ultimoDia ?? 'ninguno'}). ` +
        `Cárgalo una vez con:\n  ${CARGAR_DATASET}\n` +
        'o impórtalo desde Administración en la web. Para correr solo pruebas que no ' +
        'usan mediciones, define E2E_SIN_DATOS=1.',
    )
  }
}

/**
 * Comprueba que el administrador puede entrar. Si no, fallan todas sus
 * pruebas y sus intentos fallidos llegan al limite por IP: desde ahi, el
 * navegador recibe 429 tambien en las pruebas que no tienen que ver.
 */
async function comprobarAdministrador(api: APIRequestContext, apiURL: string): Promise<void> {
  const clave = process.env.E2E_ADMIN_PASSWORD ?? ''
  if (clave === '') return
  const correo = process.env.E2E_ADMIN_EMAIL ?? 'admin@ola.pe'
  const respuesta = await api.post(`${apiURL}/api/auth/login`, {
    data: { email: correo, password: clave },
  })
  if (respuesta.ok()) return
  throw new Error(
    `El administrador ${correo} no puede iniciar sesión (HTTP ${respuesta.status()}). ` +
      'La API lo crea al arrancar, si las tablas ya existen, con la OLA_ADMIN_PASSWORD de ' +
      'ese momento: si la API arrancó antes que las migraciones, reiníciala con ' +
      '`docker compose restart api`; si cambiaste la clave después, la cuenta conserva la anterior.',
  )
}

/**
 * Prepara la corrida antes de que empiecen las pruebas.
 *
 * Primero comprueba los datos y el administrador. Despues calienta el
 * servidor de desarrollo: Vite compila cada modulo la primera vez que se pide
 * y, sin este paso, varias pruebas en paralelo golpean rutas frias a la vez y
 * algunas agotan su tiempo de espera, dando fallos que no corresponden a
 * errores reales.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
  const apiURL = process.env.E2E_API_URL ?? 'http://localhost:8000'

  const api = await request.newContext()
  try {
    await api.get(`${apiURL}/api/health/ready`)
    await comprobarDatos(api, apiURL)
    await comprobarAdministrador(api, apiURL)
  } finally {
    await api.dispose()
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const ruta of ['/entrar', '/registro']) {
    await page.goto(`${baseURL}${ruta}`, { waitUntil: 'networkidle' })
  }
  await browser.close()

  void config
}

export default globalSetup
