/**
 * El adaptador de los puentes: lleva un modelo del estudio de Miraflores (puentes-guaire-modelo.js) al lienzo de
 * los hitos sin deformarlo. Tablero, vigas, barandas y faroles van sobre una rasante común: recta entre la cota
 * del terreno en una cabeza y la de la otra (p.rasante, src/hitos/lienzo.js). Los apoyos se alargan por separado:
 * su pie sigue el suelo dibujado bajo sí mismo, hundido lo que mide el lecho en ese punto, y la columna cubre lo que
 * falte hasta la rasante. El lecho es propio del puente (el relieve, de 30 m de malla, no trae el cauce): un cuenco
 * verde, con la franja del río, que empalma con el terreno en su borde; el suelo de la ciudad se abre ahí
 * (suelos-propios.js).
 *
 * Marco: +x de la primera cabeza a la segunda, con el origen en el medio; z a lo ancho.
 */
import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from 'three'
import { MAT } from './lienzo.js'
import { crearPuente } from './puentes-guaire-modelo.js'
import { lechoDe } from './rasante.js'

/** Por debajo de esta altura del estudio (datum en el lecho), un vértice de apoyo es pie: va con el terreno. */
const CORTE_PIE_M = 1
/** Una pila con menos lecho que esto quedaría enterrada en la orilla: no se dibuja. */
export const FONDO_MINIMO_M = 2
/** Cuánto se hunde el pie de un estribo bajo el terreno, para que el talud de la orilla no deje ver su base. */
const ENTIERRO_ESTRIBO_M = 2.5
/**
 * Lo que dibuja una parte: la estructura (tablero, vigas, barandas, faroles y estribos), que no cambia mientras el
 * puente está en pie, o el cauce (el lecho y las pilas que llegan a él), que puede cambiar de una época a otra.
 */
export const CAPA = Object.freeze({ ESTRUCTURA: 'estructura', CAUCE: 'cauce' })
/** El terraplén de un tramo a ras: de justo bajo el tablero (su losa mide 0,28 m) hasta bien adentro del suelo. */
const TOPE_TERRAPLEN_M = -0.3
const ALTO_TERRAPLEN_M = 3
/**
 * El lecho va apenas bajo el suelo dibujado (el material levanta los hitos 0,12 m, LEVANTE_M): en el borde lo tapa
 * el suelo de la ciudad y no queda un labio a la vista. El pie de las pilas se hunde un poco más, para no flotar.
 */
const HUNDIDO_LECHO_M = 0.2
const HUNDIDO_PIE_M = 0.3
const PASO_CUENCO_M = 2.5
const PASO_NORMAL_M = 0.25
/** El verde del suelo de la ciudad (variante −1 de MAT.JARDIN): el «color» son parámetros, no un tono. */
const SUELO_VERDE = Object.freeze([1, 1, -1])
/** El agua, en lineal: el gris azulado con que el suelo de la ciudad pinta el Guaire a los lados del puente. */
const AGUA = Object.freeze([0.21, 0.26, 0.175])

const sinLecho = () => 0
const lechoDeParte = ({ vano = null, anchoCauce = 0 }, fondo) => (vano ? lechoDe({ vano, ancho: anchoCauce, fondo }) : sinLecho)

function soltar(edificio) {
  const [geometrias, materiales] = [new Set(), new Set()]
  edificio.traverse((o) => { if (o.isMesh) { geometrias.add(o.geometry); materiales.add(o.material) } })
  geometrias.forEach((g) => g.dispose())
  materiales.forEach((m) => m.dispose())
}

const dibuja = (capa, cual) => !capa || capa === cual
/** ¿Se dibuja este apoyo? Los estribos van con la estructura; una pila, con el cauce y si le queda lecho para estar de pie. */
const seDibuja = ({ estribo, fondo }, capa) => (estribo ? dibuja(capa, CAPA.ESTRUCTURA) : dibuja(capa, CAPA.CAUCE) && fondo >= FONDO_MINIMO_M)

/** Los apoyos de una parte de puente, con lo que mide el lecho bajo cada uno: [{ x, z, estribo, fondo, dibujada }]. */
export function apoyosDelPuente({ id, anio, largo = null, capa = null, ...parte }) {
  const { edificio, apoyos, metadatos } = crearPuente({ id, anio, nivelDetalle: 'ciudad', largo })
  const lecho = lechoDeParte(parte, metadatos.cotaTablero)
  const lista = apoyos.children.map(({ userData: { x, z, estribo } }) => {
    const fondo = lecho(x, z)
    return Object.freeze({ x, z, estribo, fondo, dibujada: seDibuja({ estribo, fondo }, capa) })
  })
  soltar(edificio)
  return lista
}

/** Un apoyo alargado: el pie queda a su altura sobre el lecho (va con el terreno) y el resto, bajo la rasante. */
function alargar(geometria, { fondo, estribo }, cotaTablero) {
  const posicion = geometria.attributes.position
  const suelo = new Float32Array(posicion.count)
  for (let i = 0; i < posicion.count; i++) {
    const y = posicion.getY(i)
    const esPie = y < CORTE_PIE_M
    suelo[i] = esPie ? 1 : 0
    posicion.setY(i, esPie ? y - (estribo ? ENTIERRO_ESTRIBO_M : fondo + HUNDIDO_PIE_M) : y - cotaTablero)
  }
  geometria.setAttribute('suelo', new Float32BufferAttribute(suelo, 1))
  return geometria
}

const cortes = (desde, hasta, extra = []) => {
  const n = Math.max(1, Math.ceil((hasta - desde) / PASO_CUENCO_M))
  const parejos = Array.from({ length: n + 1 }, (_, i) => desde + ((hasta - desde) * i) / n)
  return [...new Set([...parejos, ...extra.filter((x) => x > desde && x < hasta)])].sort((a, b) => a - b)
}

/**
 * El suelo propio del puente en [x0, x1] × ancho: una grilla que baja lo que dice `lecho` bajo el terreno de cada
 * vértice (todos van con el suelo). Devuelve { orilla, agua }: `agua` = [desde, hasta] es la franja del río a lo
 * largo del puente, que cruza el lecho de borde a borde; sin ella, `agua` es null.
 */
export function sueloDelPuente(lecho, [x0, x1], ancho, agua = null) {
  const [xs, zs] = [cortes(x0, x1, agua ?? []), cortes(-ancho / 2, ancho / 2)]
  const capas = { orilla: [], agua: [] }
  const mojado = (x) => agua !== null && x > agua[0] && x < agua[1]
  for (let i = 0; i + 1 < xs.length; i++) {
    const destino = mojado((xs[i] + xs[i + 1]) / 2) ? capas.agua : capas.orilla
    for (let k = 0; k + 1 < zs.length; k++) {
      const [a, b, c, d] = [[xs[i], zs[k]], [xs[i + 1], zs[k]], [xs[i + 1], zs[k + 1]], [xs[i], zs[k + 1]]]
      destino.push(a, d, c, a, c, b) // de cara al cielo
    }
  }
  const geometria = (puntos) => {
    if (!puntos.length) return null
    const [posicion, normal] = [[], []]
    for (const [x, z] of puntos) {
      posicion.push(x, -lecho(x, z) - HUNDIDO_LECHO_M, z)
      // la normal del lecho, de su pendiente: así el talud se sombrea liso y no por facetas
      const dx = (lecho(x + PASO_NORMAL_M, z) - lecho(x - PASO_NORMAL_M, z)) / (2 * PASO_NORMAL_M)
      const dz = (lecho(x, z + PASO_NORMAL_M) - lecho(x, z - PASO_NORMAL_M)) / (2 * PASO_NORMAL_M)
      const largo = Math.hypot(dx, 1, dz)
      normal.push(dx / largo, 1 / largo, dz / largo)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(posicion, 3))
    g.setAttribute('normal', new Float32BufferAttribute(normal, 3))
    g.setAttribute('uv', new Float32BufferAttribute(puntos.flat(), 2)) // en metros: el punteado del pasto no se estira
    g.setAttribute('suelo', new Float32BufferAttribute(new Float32Array(puntos.length).fill(1), 1))
    return g
  }
  return { orilla: geometria(capas.orilla), agua: geometria(capas.agua) }
}

/**
 * Dibuja un puente del catálogo entre sus dos cabezas: `id` y `anio` eligen la estructura (si esa época no tiene
 * alzado, no dibuja nada: el cruce sigue en la marca); `largo`, la distancia medida entre cabezas; `vano` y
 * `anchoCauce`, el lecho abierto bajo el tablero (sin `vano`, el puente va a ras del terreno); `agua`, la franja
 * del río dentro del lecho; `aRas` y `anchoRas`, un tramo donde el tablero va a ras, sobre un terraplén propio
 * (ahí el suelo de la ciudad se abre: podría tapar el tablero); `capa`, si la parte dibuja solo la estructura o solo el
 * cauce (CAPA; por omisión, todo).
 */
export function puente(p, { id, anio, largo = null, vano = null, anchoCauce = 0, agua = null, aRas = null, anchoRas = 0, capa = null }) {
  if (capa && !Object.values(CAPA).includes(capa)) throw new Error(`puente ${id}: capa desconocida "${capa}"`)
  const { edificio, apoyos, etapa, metadatos } = crearPuente({ id, anio, nivelDetalle: 'ciudad', largo })
  try {
    if (!etapa.modelo) return
    const { largo: L, cotaTablero } = metadatos
    const lecho = lechoDeParte({ vano, anchoCauce }, cotaTablero)
    const r = p.rasante([-L / 2, 0], [L / 2, 0])
    const pintar = (malla, geometria) => r.geo(geometria, { color: malla.material.color.toArray(), mat: MAT.LISO }) // three guarda el color lineal
    if (dibuja(capa, CAPA.ESTRUCTURA)) {
      edificio.traverse((o) => {
        if (!o.isMesh || o.parent?.parent === apoyos) return
        pintar(o, o.geometry.clone().applyMatrix4(o.matrixWorld).translate(0, -cotaTablero, 0))
      })
    }
    for (const grupo of apoyos.children) {
      const { x, z, estribo } = grupo.userData
      const fondo = lecho(x, z)
      if (!seDibuja({ estribo, fondo }, capa)) continue
      for (const malla of grupo.children) pintar(malla, alargar(malla.geometry.clone().applyMatrix4(malla.matrixWorld), { fondo, estribo }, cotaTablero))
    }
    if (!dibuja(capa, CAPA.CAUCE)) return
    if (vano) {
      const suelo = sueloDelPuente(lecho, vano, anchoCauce, agua)
      r.geo(suelo.orilla, { color: SUELO_VERDE, mat: MAT.JARDIN })
      if (suelo.agua) r.geo(suelo.agua, { color: AGUA, mat: MAT.LISO })
    }
    // a ras, el puente va sobre un terraplén que sigue la rasante: el tablero no se hunde en el suelo ni vuela
    if (aRas) r.geo(new BoxGeometry(aRas[1] - aRas[0], ALTO_TERRAPLEN_M, anchoRas).translate((aRas[0] + aRas[1]) / 2, TOPE_TERRAPLEN_M - ALTO_TERRAPLEN_M / 2, 0), { color: SUELO_VERDE, mat: MAT.JARDIN })
  } finally {
    soltar(edificio)
  }
}
