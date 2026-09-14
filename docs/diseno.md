# Guía de diseño de la interfaz

## Proyecto OLA — Observatorio Litoral de Anomalías térmicas

Esta guía describe el sistema visual del rediseño del frontend (septiembre de 2026) y las reglas
que lo sostienen. Está pensada para quien rediseñe las pantallas que aún usan el estilo anterior
(Histórico, Comparar, Próximos días, cuenta y Administración) o añada pantallas nuevas.

Los motivos de cada decisión están en el [registro de decisiones](decisiones.md), sección 16.

---

## 1. Principios

1. **Móvil primero.** El usuario principal de la SRS es un pescador artesanal que entra desde el
   celular, a veces al sol. Se diseña a 360–412 px y se amplía.
2. **Lo urgente arriba.** Primero de cuándo es el dato y qué zonas están en alerta; después el
   detalle.
3. **Nunca solo color.** Todo estado se comunica con color, símbolo y texto a la vez.
4. **Lenguaje de la costa, no del laboratorio.** «Sobre lo normal», no «anomalía positiva».
5. **Una sola vista a la vez.** Una misma información no se renderiza dos veces en la página
   (tarjetas o tabla, hoja o panel), para que un lector de pantalla no la lea duplicada.

---

## 2. Color

Identidad tomada de la presentación del proyecto, adaptada a un **único tema claro**. Los tokens
están en `frontend/src/tema.css` y se usan como utilidades de Tailwind (`bg-abisal`,
`text-tinta-tenue`, `border-borde`…). La paleta por defecto de Tailwind está desactivada: un
color fuera del sistema no compila.

| Token | Valor | Uso |
|---|---|---|
| `abisal` | `#0a2530` | Banda superior, texto principal, botones primarios |
| `abisal-2` / `abisal-3` | `#0f3849` / `#133f52` | Estados de la banda (menú abierto, avatar) |
| `espuma` | `#f3f7f5` | Fondo de la página |
| `espuma-tenue` | `#a9c1c4` | Texto secundario **sobre la banda** |
| `blanco` | `#ffffff` | Superficies: tarjetas, resumen, tabla, hoja |
| `tinta-tenue` | `#465b62` | Texto secundario sobre espuma y blanco |
| `borde` | `#d3dfdd` | Bordes y separadores |
| `dorado` | `#e8b84b` | Acción destacada en la banda («Entrar»), pestaña activa, número de avisos |
| `marea` / `marea-fondo` | `#1f6f80` / `#e3eef0` | Foco visible, selección, estado «recibes avisos» |
| `realce` | `#edf3f2` | Fondo al pasar el cursor |
| `atencion-fondo` / `atencion-borde` | `#fbf1d9` / `#e2c378` | Dato atrasado, zona sin datos recientes |
| `alerta` | `#b4531f` | Icono de alerta |

**Reglas**

- El dorado se reserva para lo que pide acción o atención en la banda. No se usa como fondo de
  contenido.
- Todo texto cumple 4.5:1 sobre su fondo. Los colores de estado y los iconos cumplen 3:1.

### 2.1 Estados térmicos

Única fuente: `frontend/src/components/mapa/paleta.ts` (`COLORES` y `TINTES`). No se repiten en
`tema.css` ni en los componentes.

| Estado | Color | Tinte (fondo) | Símbolo | En resumen y alertas |
|---|---|---|---|---|
| Cálido | `#d4643a` | `#fbeae3` | flecha arriba | cálida / cálidas |
| Neutro | `#9a8650` | `#f3eedf` | raya | neutra / neutras |
| Frío | `#2b94a8` | `#e1f1f4` | flecha abajo | fría / frías |
| Sin datos recientes | `#75878c` | `#e9eeef` | círculo punteado | sin datos |

`paleta.test.ts` verifica que cada color supera 3:1 sobre espuma y sobre blanco, que el símbolo
blanco supera 3:1 sobre su color y que el texto abisal supera 4.5:1 sobre cada tinte. Si se
cambia un color, esas pruebas dicen si sigue siendo válido.

Componentes: `SimboloEstado` (solo el símbolo, decorativo) e `InsigniaEstado` (símbolo y nombre
sobre el tinte), en `components/inicio/Estado.tsx`.

---

## 3. Tipografía

Fuentes autoalojadas con `@fontsource` (sin llamadas a Google).

| Rol | Familia | Utilidad |
|---|---|---|
| Títulos | Space Grotesk | `font-titulo` |
| Texto | Inter | `font-cuerpo` (fuente por defecto de toda la aplicación) |
| Cifras y fechas | JetBrains Mono | `font-datos`, siempre con `tabular-nums` |

| Elemento | Celular | Escritorio |
|---|---|---|
| Título de pantalla (h2) | 26 px, 700 | 32 px |
| Título de sección (h3) | 20 px, 600 | 20 px |
| Texto base en marco e Inicio | 17 px | 16 px |
| Etiquetas de bloque | 11.5 px, mayúsculas, espaciado 0.06em | igual |

Las pantallas no rediseñadas conservan sus tamaños; solo heredan las familias.

---

## 4. Forma y espacio

- **Radios:** 14–16 px en tarjetas, resumen, paneles y tabla; píldora completa en insignias, chips,
  botones de la banda y contadores; 22 px en la parte superior de la hoja inferior.
- **Borde antes que sombra.** Las superficies se separan con `border-borde`. La sombra se reserva
  para lo que flota sobre el contenido: menú de cuenta y hoja inferior.
- **Objetivos táctiles:** 44 px como mínimo (botones, pestañas, marcadores). Las pestañas de la
  barra inferior miden 56 px.

### 4.1 Puntos de corte

| Ancho | Cambia |
|---|---|
| < 768 px | Barra inferior de navegación |
| ≥ 768 px | Navegación dentro de la banda; tarjetas en dos columnas |
| < 1024 px | Tarjetas de zona, tabla en «Ver todos los datos», detalle en hoja inferior |
| ≥ 1024 px | Tabla como vista principal, detalle en panel lateral, nombres fijos en el mapa |

Cuando dos vistas no deben existir a la vez se usa `useMediaQuery(ESCRITORIO)` en lugar de ocultar
con CSS.

---

## 5. Marco global

Componentes en `frontend/src/components/marco/`.

- **Banda** (`Cabecera`): abisal, fija arriba, 56 px (64 px desde 768). Logotipo «OLA» en Space
  Grotesk; navegación con subrayado dorado en la pantalla activa; «Entrar» y «Crear cuenta» sin
  sesión; menú de cuenta con sesión. Mientras se revalida la sesión no muestra ni lo uno ni lo otro.
- **Barra inferior** (`BarraInferior`): Mapa, Histórico, Comparar, Próximos días. La pestaña activa
  lleva una píldora abisal y `aria-current="page"`.
- **Menú de cuenta** (`MenuCuenta`): correo, rol, Mis zonas, Avisos (con «N sin leer»),
  Administración solo para administradores, Cerrar sesión. Se cierra con Escape, al pulsar fuera o
  al elegir, y devuelve el foco al botón. El número de avisos sin leer lo mantiene
  `AvisosProvider`.
- **Pie** (`Pie`): descripción, aviso de que OLA no reemplaza los boletines oficiales y la
  atribución obligatoria a IMARPE.
- **Saltar al contenido:** primer elemento enfocable. `html` tiene `scroll-padding-top` para que la
  banda fija nunca tape el elemento enfocado (WCAG 2.4.11).

---

## 6. Inicio

| Pieza | Componente | Reglas |
|---|---|---|
| Resumen | `ResumenEstado` | Fecha del último dato (dd/mm/aaaa) y su antigüedad, resaltada si supera la vigencia; zonas en alerta con nombre; conteo por estado, que hace de leyenda e incluye los estados sin zonas |
| Tarjetas | `TarjetasZonas` | Alertas primero y luego de norte a sur; promedio «sobre / bajo / dentro de lo normal»; línea de alerta con su tinte |
| Tabla | `TablaEstado` | Mismo orden; es la alternativa accesible al mapa; la columna de alerta puede bajar de línea |
| Detalle | `DetalleZona` | Estado y promedio, valor medido, alerta completa o por qué no la hay, aviso si no mide; acciones: recibir avisos y ver el histórico |
| Hoja inferior | `HojaInferior` | Diálogo modal: fondo inerte, foco atrapado y devuelto; se cierra con ✕, Escape, fondo o deslizando; hasta el 70 % de la pantalla |
| Panel lateral | `PanelZona` | Detalle o, sin zona elegida, invitación y accesos a las zonas en alerta |
| Espera y errores | `EstadosCarga` | Esqueleto (sin animación si se pide menos movimiento), error con «Reintentar», aviso sin datos cargados |

La zona elegida vive en la dirección (`/?zona=CALLAO`): sobrevive a una recarga y permite volver a
ella después de iniciar sesión.

---

## 7. Mapa

- **Mapa base:** OpenStreetMap pasado a gris claro con un filtro CSS sobre los mosaicos
  (`mapa.css`). Los colores de estado quedan como lo único con color. Atribución obligatoria a OSM.
- **Marcadores:** `divIcon` con el color y el símbolo del estado (`marcador.ts`). Las zonas en
  alerta son mayores, llevan un anillo de su color y quedan encima de las vecinas. La zona elegida
  lleva un borde abisal. Cada marcador es un botón con nombre accesible («Callao: cálido, en
  alerta») y se activa con Enter o Espacio.
- **Seleccionar no cambia el icono:** la selección es una clase del elemento. Cambiar el HTML
  obligaría a Leaflet a recrear el marcador y el teclado perdería el foco.
- **Etiquetas:** nombres fijos solo desde 1024 px; en celular se taparían.
- **Gestos:** en celular un dedo desplaza la página y dos mueven el mapa; en escritorio la rueda
  acerca con Ctrl. El mapa no se mueve al elegir una zona.

---

## 8. Accesibilidad

- WCAG 2.2 AA como objetivo. `axe` corre en las pruebas unitarias de cada componente y en las E2E
  de todas las pantallas, y **una violación seria o crítica hace fallar la suite**.
- **Excepción documentada:** con toda la costa a la vista, marcadores vecinos se solapan. Quedan
  fuera de la regla de tamaño de objetivo (`target-size`) por la excepción «equivalente» de
  WCAG 2.5.8: la misma selección está en las tarjetas y en la tabla. El resto de reglas se les
  aplica.
- Animaciones con `motion-safe:` o `motion-reduce:`; nada depende de una animación.
- Los iconos llevan `aria-hidden="true"` y siempre van con texto.

---

## 9. Textos

- Todos los textos en `frontend/src/i18n/textos.ts`. Tuteo.
- Fechas como `31/07/2026`, leídas como fecha local (`fechaCorta`): leerlas como UTC las
  retrocedería un día en Perú.
- Grados con signo y **espacio duro** antes de la unidad (`gradosConSigno`): «+1.58 °C» nunca se
  parte en dos líneas.
- Listas de zonas con «y», o «e» ante sonido i: «Pisco e Ilo» (`unirNombres`).
- Concordancia con «zona» (femenino) en resumen y alertas: «2 zonas en alerta: Callao (cálida)».

---

## 10. Cómo estilar

- **Tailwind v4 sin su reset global y con utilidades `!important`.** Conviven con `estilos.css`
  (pantallas antiguas) y con la hoja de Leaflet. Consecuencia: en un mismo elemento no se mezcla
  una utilidad y un `style` en línea para la misma propiedad.
- **Cuidado con `estilos.css`:** tiene reglas por elemento (`h3`, `label`, `table`, `td` con
  `white-space: nowrap`…). Si un componente nuevo necesita otro valor para esa propiedad, hay que
  ponerlo explícito con una utilidad.
- **Una hoja inyectada fuera de una capa no gana a una utilidad:** los `!important` dentro de una
  capa ganan a los de fuera. Para ocultar algo desde fuera, usar una propiedad que ninguna utilidad
  fije.
- **Leaflet** crea sus elementos fuera de React: se estilan en `components/mapa/mapa.css`, importado
  después de las hojas de Leaflet.
- Las pantallas se cargan de forma diferida (`App.tsx`). Una pantalla nueva debe añadirse con
  `lazy()`.

---

## 11. Pruebas de la interfaz

| Tipo | Dónde | Notas |
|---|---|---|
| Unitarias con axe | `src/**/*.test.tsx` | `violacionesAxe()` desactiva contraste y `region`, que jsdom no evalúa |
| E2E de comportamiento | `e2e/*.spec.ts` | Proyectos `chromium` (escritorio) y `movil` (Pixel 7, pruebas `@movil`) |
| Accesibilidad | `e2e/accesibilidad.spec.ts` | Bloqueante en todas las pantallas |
| Regresión visual | `e2e/visual.spec.ts` | Referencias generadas **dentro del contenedor de Playwright**; tolerancia de 20 píxeles; estado y reloj fijos |
| Rendimiento | `e2e/rendimiento.spec.ts` | Build de producción, 4G normal; comando aparte |

Datos fijos para capturas y pruebas del mapa: `e2e/datos/estadoFijo.ts` y `fijarEstado()`. Reloj
fijo: `page.clock.setFixedTime(HOY_FIJO)`.

Para regenerar las referencias visuales **solo tras aprobar un cambio visual**:

```bash
docker compose --profile e2e run --rm e2e sh -c "corepack enable && corepack prepare pnpm@9.15.2 --activate && pnpm install --frozen-lockfile && pnpm exec playwright test visual.spec.ts --update-snapshots"
```
