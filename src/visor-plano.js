/**
 * El plano de cada época, aparte (T25b): un visor 2D del plano viejo, sin mezclarlo con la hoja 3D.
 * Acá va la lógica pura (encaje, zoom, límites, qué imágenes pedir y el crédito); el panel está en
 * src/visor-plano-panel.js.
 *
 * El estado de la vista es { k, x, y }: la imagen se dibuja a k veces su tamaño de base con su esquina
 * superior izquierda en (x, y) del panel (CSS: translate(x, y) scale(k), con origen en 0 0).
 */

/** Hasta cuántas veces el tamaño de la imagen chica se puede acercar (el nivel mejor trae hasta 4× más píxeles). */
export const ZOOM_MAX = 8
/** Cuánto del plano queda siempre a la vista al arrastrarlo, en píxeles. */
export const MARGEN_PX = 80

/** El plano entero dentro del panel, centrado; nunca más grande que su tamaño. */
export function encajar(imagen, vista) {
  if (!(imagen.ancho > 0) || !(imagen.alto > 0)) return { k: 1, x: 0, y: 0 }
  const k = Math.min(1, vista.ancho / imagen.ancho, vista.alto / imagen.alto)
  return { k, x: (vista.ancho - imagen.ancho * k) / 2, y: (vista.alto - imagen.alto * k) / 2 }
}

/** Acerca (factor > 1) o aleja dejando quieto el punto `en` del panel; k queda entre limites.min y limites.max. */
export function acercarEn(estado, factor, en, limites) {
  const k = Math.min(limites.max, Math.max(limites.min, estado.k * factor))
  if (k === estado.k) return estado
  const r = k / estado.k
  return { k, x: en.x - (en.x - estado.x) * r, y: en.y - (en.y - estado.y) * r }
}

export const mover = (estado, dx, dy) => ({ ...estado, x: estado.x + dx, y: estado.y + dy })

/** Corre el plano lo justo para que quede a la vista al menos MARGEN_PX por cada lado. */
export function acotar(estado, imagen, vista) {
  const entre = (v, a, b) => Math.min(b, Math.max(a, v))
  return {
    ...estado,
    x: entre(estado.x, MARGEN_PX - imagen.ancho * estado.k, vista.ancho - MARGEN_PX),
    y: entre(estado.y, MARGEN_PX - imagen.alto * estado.k, vista.alto - MARGEN_PX),
  }
}

const LADO_LIVIANO = 4096

/**
 * Las imágenes del plano del año `año`: la chica primero y, si hay, la mejor. `planos` es el índice de
 * plano/epocas.json (los planos viejos calzados sobre la hoja, tools/planos-epocas.mjs); el año del plano
 * base (`añoBase`) muestra la hoja (`base`: sus URLs). Un año sin plano no tiene qué mostrar (null):
 * nunca se muestra el plano de otro año en su lugar.
 */
export function imagenesDelPlano(año, planos, { base, añoBase, liviano = false }) {
  const plano = planos.find((p) => p.año === año)
  if (!plano) return año === añoBase ? { urls: base, calzado: false } : null
  const [chico, ...resto] = plano.niveles
  const mejor = resto.filter((n) => !liviano || n.lado <= LADO_LIVIANO).at(-1)
  return { urls: mejor ? [chico.url, mejor.url] : [chico.url], calzado: true }
}

/**
 * El crédito del plano, de su ficha (datos/crece.json lo copia de fuentes/mapas/<plano>/ficha.json): la
 * fuente viene como «institución · https://…». Lo que falta se dice; no se inventa.
 */
export function creditoDe(epoca) {
  const fuente = epoca.fuente?.trim() || 'fuente sin registrar'
  const m = fuente.match(/^(.*?)\s*·\s*(https?:\/\/\S+)$/)
  return {
    titulo: epoca.titulo?.trim() || `Plano de ${epoca.año}`,
    autor: epoca.autor?.trim() || 'autor sin identificar',
    año: String(epoca.año),
    fuente: m ? m[1] : fuente,
    enlace: m ? m[2] : null,
    licencia: epoca.licencia?.trim() || 'licencia sin declarar',
  }
}
