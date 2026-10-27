/**
 * El almacenamiento cifrado de Android sin el modulo nativo: un mapa en
 * memoria. Las pruebas pueden leerlo para comprobar que el token se guarda
 * cifrado y se borra al salir.
 */
const valores = new Map<string, string>()

export function contenidoSeguro(): ReadonlyMap<string, string> {
  return valores
}

export function vaciarSeguro(): void {
  valores.clear()
}

export async function getItemAsync(clave: string): Promise<string | null> {
  return valores.get(clave) ?? null
}

export async function setItemAsync(clave: string, valor: string): Promise<void> {
  valores.set(clave, valor)
}

export async function deleteItemAsync(clave: string): Promise<void> {
  valores.delete(clave)
}
