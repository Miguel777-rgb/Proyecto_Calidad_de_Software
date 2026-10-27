import { router, type Href } from 'expo-router'

/**
 * Despues de entrar, crear la cuenta o cambiar la contrasena, la persona
 * vuelve adonde estaba: al detalle de la zona desde el que pidio avisos, a
 * «Mis zonas» si ahi le vencio la sesion, o al mapa si entro desde la banda.
 * Entrar, Registro y Recuperar se cierran: se vuelve hasta el mapa (o se abre,
 * si la app empezo en Entrar) y desde ahi se abre `volver`.
 */
export function volverTrasEntrar(volver?: string): void {
  router.dismissTo('/')
  if (volver !== undefined && volver.startsWith('/') && volver !== '/') {
    router.push(volver as Href)
  }
}
