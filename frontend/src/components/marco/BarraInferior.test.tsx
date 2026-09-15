import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BarraInferior } from './BarraInferior'
import { textos } from '@ola/compartido/i18n/textos'
import { violacionesAxe } from '../../test-utils'

function montar(ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <BarraInferior />
    </MemoryRouter>,
  )
}

const { navegacion } = textos

describe('BarraInferior', () => {
  it('ofrece las cuatro pantallas publicas en orden', () => {
    montar()
    const enlaces = within(screen.getByTestId('barra-inferior')).getAllByRole('link')
    expect(enlaces.map((e) => e.textContent)).toEqual([
      navegacion.inicio,
      navegacion.historico,
      navegacion.comparacion,
      navegacion.proyeccion,
    ])
  })

  it('cada pestana lleva a su pantalla', () => {
    montar()
    const enlaces = within(screen.getByTestId('barra-inferior')).getAllByRole('link')
    expect(enlaces.map((e) => e.getAttribute('href'))).toEqual([
      '/',
      '/historico',
      '/comparar',
      '/proyeccion',
    ])
  })

  it('marca la pantalla actual para lectores de pantalla', () => {
    montar('/historico')
    expect(screen.getByRole('link', { name: navegacion.historico })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: navegacion.comparacion })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('el mapa solo se marca en la portada y no en las demas rutas', () => {
    montar('/comparar')
    expect(screen.getByRole('link', { name: navegacion.inicio })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('se identifica como la navegacion principal', () => {
    montar()
    expect(screen.getByRole('navigation', { name: navegacion.principal })).toBeInTheDocument()
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = montar('/proyeccion')
    expect(await violacionesAxe(container)).toEqual([])
  })
})
