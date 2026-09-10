import { useCallback, useEffect, useState } from 'react'
import { listarAvisos, marcarAvisoLeido, marcarTodosLeidos, type ListaAvisos } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { textos } from '../i18n/textos'

export default function Avisos() {
  const { usuario } = useAuth()
  const [datos, setDatos] = useState<ListaAvisos | null>(null)

  const cargar = useCallback(() => {
    listarAvisos()
      .then(setDatos)
      .catch(() => setDatos(null))
  }, [])

  useEffect(cargar, [cargar])

  async function marcar(id: number) {
    await marcarAvisoLeido(id)
    cargar()
  }

  async function marcarTodos() {
    await marcarTodosLeidos()
    cargar()
  }

  if (usuario === null) {
    return (
      <section>
        <h2>{textos.avisos.titulo}</h2>
        <p className="aviso aviso--atencion">{textos.suscripciones.entrarPara}</p>
      </section>
    )
  }

  return (
    <section>
      <h2>{textos.avisos.titulo}</h2>

      {datos !== null && datos.unread > 0 && (
        <p>
          <span className="etiqueta" data-testid="sin-leer">
            {textos.avisos.sinLeer(datos.unread)}
          </span>{' '}
          <button type="button" className="enlace" onClick={marcarTodos}>
            {textos.avisos.marcarTodos}
          </button>
        </p>
      )}

      {datos !== null && datos.items.length === 0 && (
        <p className="tenue" data-testid="sin-avisos">
          {textos.avisos.ninguno}
        </p>
      )}

      <ul className="lista-avisos" data-testid="lista-avisos">
        {datos?.items.map((aviso) => {
          const situacion = textos.avisos.situacionFemenina[aviso.alert_state]
          return (
            <li
              key={aviso.id}
              className={aviso.read_at === null ? 'aviso-item aviso-item--nuevo' : 'aviso-item'}
              data-testid={`aviso-${aviso.id}`}
            >
              <div>
                <strong>{textos.avisos.tipos[aviso.kind](aviso.laboratory_name, situacion)}</strong>
                <p className="tenue">{textos.avisos.desde(aviso.started_on)}</p>
              </div>
              {aviso.read_at === null && (
                <button type="button" className="enlace" onClick={() => marcar(aviso.id)}>
                  {textos.avisos.nuevo}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
