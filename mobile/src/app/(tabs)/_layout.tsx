import { router, Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { Banda } from '../../componentes/marco/Banda'
import { BarraInferior } from '../../componentes/marco/BarraInferior'
import { PESTANAS, type Pestana } from '../../componentes/marco/pestanas'

type PropsBarraTabs = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

function Barra({ state, navigation }: PropsBarraTabs) {
  const actual = state.routes[state.index].name as Pestana['ruta']

  function alElegir(ruta: Pestana['ruta']) {
    const destino = state.routes.find((r) => r.name === ruta)
    if (destino === undefined) return
    const evento = navigation.emit({ type: 'tabPress', target: destino.key, canPreventDefault: true })
    if (!evento.defaultPrevented && ruta !== actual) navigation.navigate(ruta)
  }

  return <BarraInferior actual={actual} alElegir={alElegir} />
}

export default function LayoutPestanas() {
  return (
    <Tabs
      tabBar={(props) => <Barra {...props} />}
      screenOptions={{
        header: () => (
          <Banda alEntrar={() => router.push('/entrar')} alIr={(destino) => router.push(`/${destino}`)} />
        ),
      }}
    >
      {PESTANAS.map(({ ruta, texto }) => (
        <Tabs.Screen key={ruta} name={ruta} options={{ title: texto }} />
      ))}
    </Tabs>
  )
}
