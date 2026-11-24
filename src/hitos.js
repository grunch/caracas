/**
 * Los hitos: edificios y lugares con nombre, modelados a mano a partir del plano de 1936 y de las fotos y
 * grabados de época (specs/05). Cada uno es una definición declarativa (src/hitos/datos/*.js):
 *
 *   { id, nombre, x, y (píxeles del plano), eje: [ux, uy], nace, muere (épocas; 0 = no muere),
 *     planta, suprime (polígonos en píxeles), fuente, verificar: […], partes: [{ tipo, nace?, muere?, … }] }
 *
 * y todos van a UNA malla: constructores paramétricos (src/hitos/partes.js) sobre un lienzo común, con los
 * atributos que su material necesita para la ola, las épocas, el relieve y tinta/color.
 * Las casas genéricas que pisan un hito se apagan al cargar la ciudad (src/hitos/suprimir.js).
 */
import { BufferGeometry, BufferAttribute, Mesh } from 'three'
import { crearLienzo } from './hitos/lienzo.js'
import { parteDe } from './hitos/partes.js'
import { crearMaterialHitos, crearMaterialSombraHitos } from './hitos/material.js'
import { METRO } from './hitos/datos/marco.js'
import { plazaBolivar } from './hitos/datos/plaza-bolivar.js'
import { catedral } from './hitos/datos/catedral.js'
import { iglesias } from './hitos/datos/iglesias.js'
import { panteon } from './hitos/datos/panteon.js'
import { civiles } from './hitos/datos/civiles.js'

export { suprimirTechos, zonasDeSupresion } from './hitos/suprimir.js'

/** Todos los hitos, en el orden en que se dibujan. */
export const HITOS = Object.freeze([plazaBolivar, catedral, ...iglesias, panteon, ...civiles])

const EPOCAS = 6 // 0 = 1578 … 5 = 1936 (src/epocas.js)
const esEpoca = (e) => Number.isInteger(e) && e >= 0 && e < EPOCAS

/**
 * Revisa las definiciones contra la hoja ({ ancho, alto } en píxeles): ids únicos, dentro de la hoja, épocas
 * válidas, partes conocidas y con su fuente. Devuelve la lista de problemas (vacía si está todo bien).
 */
export function validarHitos(hitos, plano) {
  const problemas = []
  const vistos = new Set()
  const dentro = ([x, y]) => x >= 0 && y >= 0 && x <= plano.ancho && y <= plano.alto
  const vida = (de, o) => {
    const [nace, muere] = [o.nace ?? 0, o.muere ?? 0]
    if (!esEpoca(nace) || !(muere === 0 || (esEpoca(muere) && muere > nace))) problemas.push(`${de}: vida inválida (nace ${nace}, muere ${muere})`)
  }
  for (const h of hitos) {
    const de = h.id ?? '(sin id)'
    if (!h.id || vistos.has(h.id)) problemas.push(`${de}: id faltante o repetido`)
    vistos.add(h.id)
    if (!h.nombre) problemas.push(`${de}: sin nombre`)
    if (!h.fuente) problemas.push(`${de}: sin fuente`)
    if (!Array.isArray(h.verificar)) problemas.push(`${de}: falta la lista "verificar" (puede ir vacía)`)
    if (!dentro([h.x, h.y])) problemas.push(`${de}: fuera de la hoja`)
    if (!Array.isArray(h.eje) || !(Math.hypot(...h.eje) > 0)) problemas.push(`${de}: eje inválido`)
    vida(de, h)
    for (const poligono of [...(h.planta ?? []), ...(h.suprime ?? [])]) {
      if (poligono.length < 3 || !poligono.every(dentro)) problemas.push(`${de}: polígono fuera de la hoja o degenerado`)
    }
    if (!h.partes?.length) problemas.push(`${de}: sin partes`)
    for (const [i, parte] of (h.partes ?? []).entries()) {
      if (!parteDe(parte.tipo)) problemas.push(`${de}: parte ${i} de tipo desconocido "${parte.tipo}"`)
      vida(`${de} · parte ${i}`, { nace: parte.nace ?? h.nace, muere: parte.muere ?? h.muere })
    }
  }
  return problemas
}

/** Dibuja los hitos en un lienzo y devuelve sus arrays planos (sin three.js de por medio, salvo las piezas). */
export function construirHitos(hitos, coords) {
  if (Math.abs(coords.metro - METRO) > 1e-9) throw new Error(`hitos: definidos a ${METRO} m/px y el plano viene a ${coords.metro}`)
  const lienzo = crearLienzo()
  const rangos = []
  hitos.forEach((h, i) => {
    const desde = lienzo.vertices
    const p = lienzo.hito({ origen: coords.aMundo(h.x, h.y), eje: h.eje, nace: h.nace ?? 0, muere: h.muere ?? 0, semilla: i + 1 })
    for (const { tipo, nace, muere, ...medidas } of h.partes) {
      const dibujar = parteDe(tipo)
      if (!dibujar) throw new Error(`hito ${h.id}: parte de tipo desconocido "${tipo}"`)
      dibujar(p.con({ nace, muere }), medidas)
    }
    rangos.push({ id: h.id, desde, hasta: lienzo.vertices })
  })
  return { ...lienzo.datos(), rangos }
}

export function geometriaHitos({ posiciones, normales, colores, hitos, vidas, anclas, uvs, indices }) {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(posiciones, 3))
  g.setAttribute('normal', new BufferAttribute(normales, 3))
  g.setAttribute('aColor', new BufferAttribute(colores, 3))
  g.setAttribute('aHito', new BufferAttribute(hitos, 4))
  g.setAttribute('aVida', new BufferAttribute(vidas, 2))
  g.setAttribute('aAncla', new BufferAttribute(anclas, 4))
  g.setAttribute('aUv', new BufferAttribute(uvs, 2))
  g.setIndex(new BufferAttribute(indices, 1))
  g.computeBoundingSphere()
  return g
}

/**
 * La malla de los hitos; `U` son los uniforms de la ciudad (crearMaterialCiudad), compartidos. `datos`: los
 * arrays ya construidos (construirHitos; en el sitio llegan de un worker, src/hitos-pedido.js); si faltan, se
 * construyen acá.
 */
export function crearHitos({ hitos = HITOS, coords, U, datos = null }) {
  const problemas = validarHitos(hitos, { ancho: coords.hoja.ancho / coords.metro, alto: coords.hoja.alto / coords.metro })
  if (problemas.length) throw new Error(`hitos: ${problemas.join('; ')}`)
  datos ??= construirHitos(hitos, coords)
  const malla = new Mesh(geometriaHitos(datos), crearMaterialHitos({ U }))
  malla.customDepthMaterial = crearMaterialSombraHitos(malla.material)
  malla.castShadow = true
  malla.frustumCulled = false // el relieve y la ola los mueven en el shader: la esfera de la CPU no sirve
  malla.name = 'hitos'
  malla.userData.rangos = datos.rangos
  return malla
}
