import type { Importacion } from '../api/client'
import { textos } from '../i18n/textos'

const numero = (valor: number) => valor.toLocaleString('es-PE')

function duracion(ms: number | null): string {
  if (ms === null) return '—'
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}

interface Props {
  importacion: Importacion
  detallado?: boolean
}

export function ResumenImportacion({ importacion, detallado = false }: Props) {
  const fallo = importacion.status === 'failed'

  return (
    <div className={`resumen ${fallo ? 'resumen--fallo' : 'resumen--ok'}`}>
      <p>
        <strong>{importacion.filename}</strong> — {textos.admin.estados[importacion.status]}
      </p>

      {fallo ? (
        <p role="alert">{importacion.error_message}</p>
      ) : (
        <ul className="contadores">
          <li>
            {textos.admin.columnas.total}: <strong>{numero(importacion.rows_total)}</strong>
          </li>
          <li>
            {textos.admin.columnas.insertadas}:{' '}
            <strong data-testid="filas-insertadas">{numero(importacion.rows_inserted)}</strong>
          </li>
          <li>
            {textos.admin.columnas.actualizadas}:{' '}
            <strong>{numero(importacion.rows_updated)}</strong>
          </li>
          <li>
            {textos.admin.columnas.sinCambios}:{' '}
            <strong>{numero(importacion.rows_unchanged)}</strong>
          </li>
          <li>
            {textos.admin.columnas.rechazadas}:{' '}
            <strong data-testid="filas-rechazadas">{numero(importacion.rows_rejected)}</strong>
          </li>
          <li>
            {textos.admin.columnas.duracion}: <strong>{duracion(importacion.duration_ms)}</strong>
          </li>
        </ul>
      )}

      {detallado && importacion.error_sample !== null && importacion.error_sample.length > 0 && (
        <details data-testid="detalle-errores">
          <summary>{textos.admin.verDetalle}</summary>
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>{textos.admin.linea}</th>
                  <th>{textos.admin.motivo}</th>
                </tr>
              </thead>
              <tbody>
                {importacion.error_sample.map((e) => (
                  <tr key={e.line}>
                    <td>{e.line}</td>
                    <td>{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
