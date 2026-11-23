/**
 * La mesa: lo que se ve fuera de la hoja, sobre todo al alejarse, cuando el plano queda como un rectángulo
 * apoyado (src/camara.js, `distanciaMaxima`). Un gris cálido y apagado, no negro: la hoja se recorta sobre
 * él sin que el borde parezca un hueco. La página (index.html: `--fondo` y `theme-color`) usa el mismo.
 */
export const COLOR_MESA = 0x49443e
export const COLOR_MESA_CSS = `#${COLOR_MESA.toString(16).padStart(6, '0')}`
