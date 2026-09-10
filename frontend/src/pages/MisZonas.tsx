import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  darseDeBaja,
  listarLaboratorios,
  listarSuscripciones,
  suscribirse,
  type Laboratorio,
} from '../api/client'
import { useAuth } from '../auth/useAuth'
import { textos } from '../i18n/textos'

export default function MisZonas() {
  const { usuario } = useAuth()
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([])
  const [seguidas, setSeguidas] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ocupada, setOcupada] = useState<string | null>(null)

  const cargar = useCallback(() => {
    Promise.all([listarLaboratorios(), listarSuscripciones()])
      .then(([lista, suscripciones]) => {
        setLaboratorios(lista)
        setSeguidas(suscripciones.map((s) => s.laboratory.code))
      })
      .catch(() => setError(textos.errores.inesperado))
  }, [])

  useEffect(cargar, [cargar])

  async function alternar(code: string) {
    setError(null)
    setOcupada(code)
    const seguia = seguidas.includes(code)
    try {
      if (seguia) {
        await darseDeBaja(code)
        setSeguidas((actual) => actual.filter((c) => c !== code))
      } else {
        await suscribirse(code)
        setSeguidas((actual) => [...actual, code])
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : textos.errores.inesperado)
    } finally {
      setOcupada(null)
    }
  }

  if (usuario === null) {
    return (
      <section>
        <h2>{textos.suscripciones.titulo}</h2>
        <p className="aviso aviso--atencion">{textos.suscripciones.entrarPara}</p>
      </section>
    )
  }

  return (
    <section>
      <h2>{textos.suscripciones.titulo}</h2>
      <p className="tenue">{textos.suscripciones.ayuda}</p>

      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {seguidas.length === 0 && (
        <p className="aviso aviso--atencion" data-testid="sin-suscripciones">
          {textos.suscripciones.ninguna}
        </p>
      )}

      <ul className="lista-zonas" data-testid="lista-zonas">
        {laboratorios.map((lab) => {
          const sigue = seguidas.includes(lab.code)
          return (
            <li key={lab.code} data-testid={`zona-${lab.code}`}>
              <span>
                {lab.name}
                {sigue && (
                  <span className="etiqueta" data-testid={`siguiendo-${lab.code}`}>
                    {textos.suscripciones.siguiendo}
                  </span>
                )}
              </span>
              <button
                type="button"
                className={sigue ? 'secundario' : ''}
                disabled={ocupada === lab.code}
                onClick={() => alternar(lab.code)}
              >
                {sigue ? textos.suscripciones.dejarDeSeguir : textos.suscripciones.seguir}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
