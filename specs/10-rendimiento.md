# Rendimiento: presupuesto y cómo medirlo

**Estado:** fase 0 (medición repetible y presupuesto). El análisis y el plan por fases están en el issue
[#172](https://github.com/grunch/caracas/issues/172); las tareas, en `specs/07` (T76).

## 1. Para qué

El sitio levanta 39 mil casas, 37 mil árboles y decenas de hitos sobre un plano de 8192 px. Sin un número que
mirar, cada mejora visual lo hace un poco más lento y nadie lo nota hasta que un teléfono cierra la pestaña.
Este spec fija **qué se mide, cómo y contra qué tope**.

## 2. Cómo se mide

```sh
npm run build && npx vite preview --port 4173        # el sitio construido, con los datos completos; queda sirviendo
# en otra terminal (o con el servidor en segundo plano):
node tests/e2e/medir-rendimiento.mjs http://localhost:4173/ --gpu --salida medicion.json
```

`tests/e2e/medir-rendimiento.mjs` abre el sitio con `?sinintro` en Chromium (1280 × 800) y mide:

| Qué | Cómo |
|---|---|
| **Hitos del arranque** (ms desde la navegación) | `window.lab.ready`, las casas, la línea de tiempo y los árboles |
| **Tareas largas** del hilo principal | `PerformanceObserver` de `longtask`: cuántas, cuánto suman y la mayor |
| **Pedidos al abrir** | protocolo de DevTools, bytes que viajan (comprimidos), hasta 4 s después del último hito, sin tocar nada; de una descarga que sigue en curso al cortar se cuenta lo que ya llegó |
| **Memoria** | heap de JS (`performance.memory`) y los arreglos de geometría que siguen vivos en JS, con la ciudad en pie y en color |
| **Cuadro** | llamadas de dibujo y triángulos de un cuadro entero (sombras incluidas) en tres vistas: centro, valle y cerca |
| **Tiempo por cuadro** (solo con `--gpu`) | 40 cuadros por vista girando la cámara, sin tope de vsync, con un `readPixels` de 1 píxel para esperar a la GPU; mediana y percentil 90 |

- `--gpu` usa la GPU del equipo. Sin él corre con SwiftShader (lo que hay en el CI): ahí el tiempo por cuadro no
  se mide, porque no dice nada de un equipo real.
- `--liviano` fuerza el modo liviano (`src/calidad.js`).
- `--estricto` sale con error si un tope medido no pasa (para el CI, fase 5).
- La parte pura (resumir y comparar) está en `tools/rendimiento/rendimiento-lib.mjs`, con tests.

**Lo que este script no mide:** un teléfono real, una GPU integrada, la red real de GitHub Pages ni la memoria
de la GPU. Eso se mide a mano en el equipo (§ 4).

## 3. El presupuesto

Los topes viven en `tools/rendimiento/presupuesto.json` y son las metas del plan (#172), no el estado de hoy.
Equipo de referencia: escritorio con NVIDIA RTX 2060, Chromium, servidor local.

| Tope | Clave | Meta | Línea base (`main` en `f7cd518`, datos `datos-2026-11-23-2ecbb92`) |
|---|---|---|---|
| Casas visibles | `casasMs` | 5 000 ms | 12 544 ms |
| Tarea más larga del hilo principal | `tareaMasLargaMs` | 200 ms | 8 844 ms |
| Bytes pedidos al abrir | `bytesAlAbrir` | 8 MB | 23,5 MB (21 pedidos) |
| Heap de JS con la ciudad en pie | `heapMB` | 250 MB | 803 MB (444 MB son arreglos de geometría) |
| Triángulos por cuadro, vista del centro | `triangulosCentro` | 2 millones | 12,7 millones (8 llamadas) |
| Tiempo por cuadro, vista del centro | `msPorCuadroCentro` | 16,6 ms | 11,2 ms (p90 12,2) |

La línea base es una corrida; entre corridas los tiempos varían un 5 %. El heap de la línea base salió 803 MB en
esta corrida y ~600 MB en la del análisis: depende de cuándo pasa el recolector, así que se mira el orden de
magnitud, no la unidad.

Un PR que toca la carga, la geometría, los shaders o las texturas corre la medición antes y después y pega las
dos en su descripción. Un tope que hoy no pasa no bloquea nada hasta que su fase lo cumpla; desde entonces, no
se vuelve a pasar.

## 4. Equipos reales (pendiente)

Falta la línea base de un teléfono Android de gama media, un iPhone y una portátil con GPU integrada: hay que
abrir el sitio en cada uno y anotar el tiempo hasta las casas, si se puede mover la vista mientras cargan, los
cuadros por segundo con la ciudad en pie y si la pestaña se cierra. La meta de T70 (30 fps en un teléfono de
gama media) se midió antes de que la ciudad llegara a su tamaño de hoy. La fase 5 agrega `?medir`, un panel
con estos números en la misma página, para no depender de las herramientas del navegador.
