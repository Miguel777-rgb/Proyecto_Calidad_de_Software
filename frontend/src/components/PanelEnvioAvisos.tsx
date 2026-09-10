import { useState } from 'react'
import { ApiError, enviarAvisosPendientes, type ResumenEnvio } from '../api/client'
import { textos } from '../i18n/textos'

/** Segundo paso del envio (RF-03). La evaluacion registra los avisos; aqui
 *  salen los correos, de modo que un servidor caido no bloquee aquella. */
export function PanelEnvioAvisos() {
  const [enviando, setEnviando] = useState(false)
  const [resumen, setResumen] = useState<ResumenEnvio | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function enviar() {
    setError(null)
    setResumen(null)
    setEnviando(true)
    try {
      setResumen(await enviarAvisosPendientes())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="tarjeta">
      <h3>{textos.avisos.envio.titulo}</h3>
      <p className="tenue">{textos.avisos.envio.ayuda}</p>

      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {resumen !== null && (
        <p className="aviso" role="status" data-testid="resumen-envio">
          {textos.avisos.envio.resultado(resumen)}
          {resumen.failed > 0 && ` ${textos.avisos.envio.reintento}`}
        </p>
      )}

      <button type="button" className="secundario" onClick={enviar} disabled={enviando}>
        {enviando ? textos.avisos.envio.enviando : textos.avisos.envio.boton}
      </button>
    </div>
  )
}
