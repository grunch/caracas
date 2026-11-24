# Rendimiento: presupuesto, cómo medirlo y cómo está hecho

**Estado:** fases 0 a 5 del plan del issue [#172](https://github.com/grunch/caracas/issues/172) hechas en el
equipo de referencia. **Falta medir en teléfonos y en una GPU integrada** (§ 5). Tarea T76 en `specs/07`.

## 1. Para qué

El sitio levanta 39 mil casas, 37 mil árboles y decenas de hitos sobre un plano de 8192 px. Sin un número que
mirar, cada mejora visual lo hace un poco más lento y nadie lo nota hasta que un teléfono cierra la pestaña.
Este spec fija **qué se mide, cómo y contra qué tope**, y cuenta qué hace el sitio para llegar.

## 2. Cómo se mide

```sh
npm run build && npx vite preview --port 4173        # el sitio construido, con los datos completos; queda sirviendo
# en otra terminal (o con el servidor en segundo plano):
node tests/e2e/medir-rendimiento.mjs http://localhost:4173/ --gpu --salida medicion.json
```

`tests/e2e/medir-rendimiento.mjs` abre el sitio con `?sinintro` en Chromium (1280 × 800) y mide:

| Qué | Cómo |
|---|---|
| **Hitos del arranque** (ms desde la navegación) | `window.lab.ready`, las primeras casas, todas las casas, la línea de tiempo y los árboles, cada uno cuando llega |
| **Tareas largas** del hilo principal | `PerformanceObserver` de `longtask`: cuántas, cuánto suman y la mayor |
| **Pedidos al abrir** | protocolo de DevTools, bytes que viajan (comprimidos), hasta 4 s después del último hito, sin tocar nada y sin service worker (`?sinsw`); de una descarga que sigue en curso al cortar se cuenta lo que ya llegó |
| **Segunda visita** | la misma página abierta otra vez con el service worker ya instalado: lo que pide la página a la red y lo que pide el service worker por su cuenta |
| **Memoria** | heap de JS (`performance.memory`) y los arreglos de geometría que siguen vivos en JS, con la ciudad en pie y en color |
| **Cuadro** | llamadas de dibujo y triángulos de un cuadro entero (sombras incluidas) en tres vistas: centro, valle y cerca |
| **Tiempo por cuadro** (solo con `--gpu`) | 40 cuadros por vista girando la cámara, sin tope de vsync, con un `readPixels` de 1 píxel para esperar a la GPU; mediana y percentil 90 |

- `--gpu` usa la GPU del equipo. Sin él corre con SwiftShader (lo que hay en el CI): ahí el tiempo por cuadro no
  se mide, porque no dice nada de un equipo real.
- `--liviano` fuerza el modo liviano (`src/calidad.js`).
- `--estricto` sale con error si un tope medido no pasa.
- La parte pura (resumir y comparar) está en `tools/rendimiento/rendimiento-lib.mjs`, con tests.
- Los tiempos dependen de cuántos núcleos están libres: con otra carga en la máquina, las casas tardan casi el
  doble. Se mide con la máquina quieta, y se mira el orden de magnitud.

**En el equipo, sin herramientas: `?medir`.** Agrega un panel (`src/medir-panel.js`) con el tiempo por cuadro y
los cuadros por segundo (mediana de los últimos 60), las llamadas de dibujo y los triángulos del cuadro, el tamaño
del lienzo, los píxeles por punto, el nivel de calidad, la memoria de JS (donde el navegador la dice) y el nivel
del plano. Con él la vista se dibuja sin parar. Es lo que hay que abrir en un teléfono para anotar su línea base.

**Lo que no se mide:** la memoria de la GPU, ni la red real de GitHub Pages.

## 3. El presupuesto

Los topes viven en `tools/rendimiento/presupuesto.json`. Equipo de referencia: escritorio con NVIDIA RTX 2060 y
16 núcleos, Chromium, servidor local.

| Tope | Clave | Meta | Antes (`main` en `f7cd518`) | Ahora |
|---|---|---|---|---|
| Todas las casas visibles | `casasMs` | 5 000 ms | 12 544 ms | 5 700 ms (las primeras, a los 3 850) |
| Tarea más larga del hilo principal | `tareaMasLargaMs` | 200 ms | 8 844 ms | 390 ms |
| Bytes pedidos al abrir | `bytesAlAbrir` | 8 MB | 23,5 MB | 9,4 MB (y unos cientos de bytes en la segunda visita) |
| Heap de JS con la ciudad en pie | `heapMB` | 250 MB | 803 MB | 257 MB |
| Triángulos por cuadro, vista del centro | `triangulosCentro` | 2 millones | 12,7 millones | 4,4 millones |
| Tiempo por cuadro, vista del centro | `msPorCuadroCentro` | 16,6 ms | 11,2 ms | 7,5 ms |

Las metas son las del plan y, salvo el tiempo por cuadro, **todavía no se cumplen del todo**: quedan cerca. No
se bajaron para que la tabla diera verde. Lo que falta de cada una:

- **Casas**: el pak se pide temprano y se reparte entre workers; lo que queda es leer el pak (1,5 s por worker)
  y levantar las casas. Bajaría generando la geometría en el pipeline en vez de en el navegador.
- **Tarea más larga**: subir geometría a la GPU y compilar shaders.
- **Bytes**: `ciudad.pak` (3,8 MB), `relieve.bin` (1,4), la máscara de suelo de 2048 (1,4) y `crece.png` (0,9).
- **Triángulos**: los árboles enteros cerca de la cámara y el pase de sombras, que dibuja todo otra vez.

Un PR que toca la carga, la geometría, los shaders o las texturas corre la medición antes y después y pega las
dos en su descripción.

**En el CI** se comprueba lo que se puede comprobar sin GPU: el tamaño del build
(`node tools/rendimiento/presupuesto-build.mjs`, después de `npx vite build`), con los topes de `build` en el
mismo `presupuesto.json`: el JS que se baja al abrir (hoy 298 kB con gzip, tope 330), los workers (132 kB, tope
150) y el service worker (1,2 kB, tope 3). Son el tamaño de hoy más un margen: pasarlos tiene que ser una
decisión. Los tiempos y los triángulos no se comprueban en el CI: con render por software y la muestra de datos
no dicen nada.

## 4. Cómo está hecho

**Arrancar sin congelar la página**

- Las casas se levantan en **workers** (`src/ciudad-trabajador.js`, `src/ciudad-pedido.js`): hasta 4, 2 en un
  equipo liviano, 1 con render por software o en el nivel mínimo (`cuantosTrabajadores`, `src/calidad.js`). Si no
  hay workers o uno falla, su parte se levanta en la página, cediendo el hilo entre baldosas.
  `?sintrabajador` lo fuerza.
- Llegan por **baldosas** de 512 m (`src/baldosas.js`), las de la plaza primero, y en dos pases: primero lo que se
  ve en la época con que abre el sitio (una octava parte), después el resto. La entrada levanta la ciudad cuando
  llegó el primer pase.
- Los **hitos** se construyen en otro worker (`src/hitos-trabajador.js`). `window.lab.ready` pasa a `true`
  cuando ya están en la escena.
- Los datos imprescindibles (`ciudad.json`, `crece.json`, `ciudad.pak`, `relieve.bin`) se piden desde un script
  en `index.html`, a la vez que el JS (`src/temprano.js`).

**Bajar menos**

- El plano general sube de **nivel** (2048 → 4096 → 8192) según la vista de destino y los píxeles del lienzo
  (`src/plano-niveles.js`); el de 8192 (12 MB) solo se baja si hace falta. Las máscaras de suelo y de rótulos
  empiezan en 2048 y suben con el plano.
- Un **service worker** (`src/sw.js`, `src/cache-datos.js`) guarda el JS, que lleva hash, y los datos con su
  sha256 de `datos/manifiesto.json` en la clave: después de un `datos:publicar` solo se baja lo que cambió. La
  página y el manifiesto van siempre a la red. Solo existe en el sitio construido; `?sinsw` lo da de baja.

**Menos memoria**

- Cada baldosa de casas **suelta sus arreglos** de JS al subirlos a la GPU (`geometriaDePaquete`,
  `src/ciudad-geometria.js`). Quien necesite leer esa geometría después (un test, una herramienta) abre con
  `?arreglos`. Los hitos conservan los suyos.
- `aInfo` va en enteros de 16 bits. `aPared` y `aTecho` **no** se pueden compactar sin cambiar el aspecto: el
  shader sortea vanos y tejas con el largo de la pared y del faldón, y redondearlos cambia el sorteo.

**Dibujar menos**

- De cada baldosa de casas se mandan a dibujar solo los tramos de índices de las casas que **viven en la época
  que se mira** (`src/casas.js`, `ponerEpocas`); three.js saltea las baldosas **fuera de la vista** y del mapa de
  sombras. La esfera de cada baldosa cubre la hoja lisa y la baldosa levantada sobre el relieve. Las baldosas van
  antes que el suelo (`renderOrder`), como cuando eran una sola malla: el piso de los patios va a su misma altura.
- Las baldosas que no se vieron todavía se suben a la GPU de a una en los ratos sin cuadros (`subirUna`), para
  que cambiar de época no las suba todas juntas.
- Los **árboles** van en grupos por baldosa de 2 km y por vida (`src/arboles.js`), con dos mallas instanciadas
  por grupo: el árbol entero y, a más de 1 200 m, la copa sola en 20 triángulos. No se dibujan los que no viven
  en la época ni, en tinta, el monte.
- **Resolución adaptable** (`src/resolucion.js`): si los cuadros salen lentos mientras la vista se mueve, se
  dibuja con menos píxeles por punto; quieta, con todos.
- **Tres niveles de calidad** (`src/calidad.js`): completo, liviano (teléfonos, GPUs chicas, menos de 4 GB) y
  mínimo (`?minimo`, o 2 GB o menos: sin sombras, un píxel por punto, un worker).

**Parámetros de la página para probar:** `?medir`, `?liviano`, `?minimo`, `?pesado`, `?sintrabajador`, `?sinsw`,
`?arreglos`, `?sombras=N`, `?contorno=0`, `?grano=0`.

## 5. Equipos reales (pendiente)

Falta la línea base de un teléfono Android de gama media, un iPhone y una portátil con GPU integrada. En cada
uno: abrir el sitio con `?medir`, levantar la ciudad en color y anotar los cuadros por segundo quieta y moviendo
la vista, el nivel de calidad que eligió, cuánto tardan las casas, si se puede mover la vista mientras cargan y
si la pestaña se cierra. La meta de T70 (30 fps en un teléfono de gama media) se midió antes de que la ciudad
llegara a su tamaño de hoy.

Dos cosas de este trabajo **solo se pueden juzgar ahí**: si las llamadas de dibujo de más (de 8 a unas 150 por
cuadro) pesan en un teléfono, y si la resolución adaptable se activa cuando lo lento es la GPU (en el equipo de
referencia solo se pudo probar frenando la CPU).
