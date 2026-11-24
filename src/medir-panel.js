/**
 * `?medir`: un panel con lo que cuesta cada cuadro, para probar el sitio en un teléfono o en cualquier equipo
 * sin las herramientas del navegador (specs/10-rendimiento.md). Con él la vista se dibuja sin parar, para que
 * los cuadros por segundo se puedan leer también con la vista quieta.
 */

const numero = (n, decimales = 0) => n.toLocaleString('es', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })

/** La mediana de una muestra de tiempos (ms); null si está vacía. */
export function medianaDe(ms) {
  if (!ms.length) return null
  return [...ms].sort((a, b) => a - b)[ms.length >> 1]
}

/**
 * Las líneas del panel. `ms`: lo que tardaron los últimos cuadros; `llamadas` y `triangulos`: los del último
 * cuadro entero (sombras incluidas); `pixeles`: por punto de pantalla; `lienzo`: [ancho, alto] en píxeles;
 * `heapMB`: null donde el navegador no lo dice; `nivel`: el lado del plano general puesto; `calidad`.
 */
export function lineasDeMedicion({ ms, llamadas, triangulos, pixeles, lienzo, heapMB = null, nivel = null, calidad = 'completa' }) {
  const m = medianaDe(ms)
  return [
    m === null ? 'sin cuadros todavía' : `${numero(m, 1)} ms por cuadro · ${numero(1000 / m)} por segundo`,
    `${numero(llamadas)} llamadas · ${numero(triangulos / 1e6, 2)} M de triángulos`,
    `${lienzo[0]} × ${lienzo[1]} px · ${numero(pixeles, 2)} px por punto · calidad ${calidad}`,
    [heapMB === null ? 'memoria: el navegador no la dice' : `${numero(heapMB)} MB de JS`, nivel === null ? null : `plano de ${nivel} px`].filter(Boolean).join(' · '),
  ]
}

const CUADROS = 60 // cuántos cuadros se promedian
const CADA_MS = 500 // cada cuánto se reescribe el panel

/**
 * El panel. `contenedor`: dónde colgarlo; `leer()`: lo que no sale de los tiempos ({ llamadas, triangulos,
 * pixeles, lienzo, heapMB, nivel, calidad }). `cuadro(ahora)` se llama después de dibujar cada cuadro.
 * `documento`: con qué crear el elemento (por omisión, el de la página).
 */
export function crearPanelDeMedicion({ contenedor, leer, documento = document }) {
  const panel = Object.assign(documento.createElement('pre'), { id: 'medir' })
  Object.assign(panel.style, {
    position: 'fixed', left: '8px', top: '8px', zIndex: 1000, margin: 0, padding: '6px 9px', pointerEvents: 'none',
    font: '12px/1.45 ui-monospace, Menlo, Consolas, monospace', color: '#f1e6cd', background: 'rgba(30, 24, 18, 0.86)', borderRadius: '4px',
  })
  panel.setAttribute('aria-hidden', 'true') // un instrumento para quien mide, fuera de la interfaz
  contenedor.appendChild(panel)
  const ms = []
  let anterior = null
  let escrito = -Infinity
  return {
    panel,
    cuadro(ahora) {
      if (anterior !== null) { ms.push(ahora - anterior); if (ms.length > CUADROS) ms.shift() }
      anterior = ahora
      if (ahora - escrito < CADA_MS) return
      escrito = ahora
      panel.textContent = lineasDeMedicion({ ms, ...leer() }).join('\n')
    },
  }
}
