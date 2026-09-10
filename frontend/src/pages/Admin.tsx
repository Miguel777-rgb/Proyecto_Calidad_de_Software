import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, importarCsv, listarImportaciones, type Importacion } from '../api/client'
import { textos } from '../i18n/textos'
import { PanelConfiguracion } from '../components/PanelConfiguracion'
import { PanelEnvioAvisos } from '../components/PanelEnvioAvisos'
import { ResumenImportacion } from '../components/ResumenImportacion'

export default function Admin() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ultima, setUltima] = useState<Importacion | null>(null)
  const [historial, setHistorial] = useState<Importacion[]>([])
  const entradaArchivo = useRef<HTMLInputElement>(null)

  const cargarHistorial = useCallback(() => {
    listarImportaciones()
      .then(setHistorial)
      .catch(() => setHistorial([]))
  }, [])

  useEffect(cargarHistorial, [cargarHistorial])

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setUltima(null)

    if (archivo === null) {
      setError(textos.errores.archivoRequerido)
      return
    }

    setImportando(true)
    try {
      const resultado = await importarCsv(archivo)
      setUltima(resultado)
      setArchivo(null)
      if (entradaArchivo.current !== null) entradaArchivo.current.value = ''
      cargarHistorial()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setImportando(false)
    }
  }

  return (
    <section>
      <h2>{textos.admin.titulo}</h2>

      <PanelConfiguracion />

      <PanelEnvioAvisos />

      <div className="tarjeta">
        <h3>{textos.admin.importar}</h3>
        <p className="tenue">{textos.admin.ayudaArchivo}</p>

        <form onSubmit={alEnviar}>
          <label htmlFor="archivo">{textos.admin.seleccionar}</label>
          <input
            id="archivo"
            ref={entradaArchivo}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />

          {error !== null && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={importando}>
            {importando ? textos.admin.importando : textos.admin.boton}
          </button>
        </form>
      </div>

      {ultima !== null && (
        <div data-testid="resultado-importacion">
          <h3>{textos.admin.resultado}</h3>
          <ResumenImportacion importacion={ultima} detallado />
        </div>
      )}

      <h3>{textos.admin.historial}</h3>
      {historial.length === 0 ? (
        <p className="tenue">{textos.admin.sinImportaciones}</p>
      ) : (
        <div className="tabla-desplazable">
          <table data-testid="historial-importaciones">
            <thead>
              <tr>
                <th>{textos.admin.columnas.archivo}</th>
                <th>{textos.admin.columnas.estado}</th>
                <th>{textos.admin.columnas.total}</th>
                <th>{textos.admin.columnas.insertadas}</th>
                <th>{textos.admin.columnas.actualizadas}</th>
                <th>{textos.admin.columnas.rechazadas}</th>
                <th>{textos.admin.columnas.autor}</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((registro) => (
                <tr key={registro.id}>
                  <td>{registro.filename}</td>
                  <td>{textos.admin.estados[registro.status]}</td>
                  <td>{registro.rows_total.toLocaleString('es-PE')}</td>
                  <td>{registro.rows_inserted.toLocaleString('es-PE')}</td>
                  <td>{registro.rows_updated.toLocaleString('es-PE')}</td>
                  <td>{registro.rows_rejected.toLocaleString('es-PE')}</td>
                  <td>{registro.uploaded_by_email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
