import Constants from 'expo-constants'

export interface ConfiguracionApp {
  variante: string
  /** Raiz de la API sin barra final, escrita en el APK al compilar. */
  apiUrl: string
}

/** Lee lo que app.config.ts dejo en `extra` al compilar. */
export function configuracion(extra: unknown = Constants.expoConfig?.extra): ConfiguracionApp {
  const datos = (extra ?? {}) as Partial<ConfiguracionApp>
  if (typeof datos.apiUrl !== 'string' || datos.apiUrl === '') {
    // Sin direccion de la API la app no puede hacer nada util: mejor fallar
    // en cuanto arranca que mostrar errores de red confusos.
    throw new Error('La app se compilo sin la direccion de la API (extra.apiUrl).')
  }
  return { variante: String(datos.variante ?? 'desconocida'), apiUrl: datos.apiUrl.replace(/\/+$/, '') }
}
