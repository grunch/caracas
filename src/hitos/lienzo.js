/**
 * El lienzo de los hitos: junta la geometría de todos los edificios modelados a mano en arrays planos,
 * para una sola malla (un draw call). Cada hito se dibuja con un "pintor" que lleva su marco (origen y eje
 * en el mundo), su vida (nace, muere) y su ancla en el relieve; las piezas (src/hitos/piezas.js) le pasan
 * geometrías de three.js en coordenadas locales: x a lo largo del eje, y hacia arriba, z a la derecha
 * del eje (al sur, si el eje mira al este).
 *
 * Por vértice: posición y normal (mundo), color lineal, aHito = (distancia de su hito a la plaza, semilla,
 * material, pie), aVida = (nace, muere; muere = 0: no muere), aAncla = (ancla x, z · apoyo x, z) y aUv.
 * - ancla: el punto del terreno cuya altura toma el hito entero (así no se inclina en la cuesta).
 * - apoyo: el punto bajo cada objeto; el piso es el más alto de los dos (una terraza es plana donde el
 *   terreno baja y lo sigue donde sube). "Siguiendo", el apoyo es el propio vértice (rejas, pretiles, losas).
 * - pie = 1: el vértice baja hasta el terreno, para que las paredes no floten.
 * - pie = 2 (rasante de un puente): el ancla son las dos cabezas (x, z de cada una) y el vértice va sobre la
 *   recta que une la cota del suelo en una con la de la otra; no mira el terreno que tiene debajo.
 * - pie = 3 (el pie de un apoyo y el lecho de un puente): sobre el suelo tal como se dibuja bajo el vértice
 *   (la malla de la hoja, src/relieve.js), para empalmar con él sin escalón.
 */
import { Matrix4, Vector3, Color } from 'three'

/** Materiales del shader de los hitos (src/hitos/material.js); van en aHito.z. */
export const MAT = Object.freeze({ LISO: 0, TEJA: 1, VERJA: 2, JARDIN: 3, TIERRA: 4, LONA: 5, LUZ: 6, RELOJ: 7, SILLAR: 8 })

/** Cómo se apoya un vértice (aHito.w): sobre su piso, bajando al terreno (pie) o sobre la rasante de un puente. */
export const APOYO = Object.freeze({ NINGUNO: 0, PIE: 1, RASANTE: 2, SUELO: 3 })

const UMBRAL_PIE_M = 0.01 // por debajo de esto un vértice es "pie" y baja hasta el terreno
const PROPIO = 'propio'

const lineales = new Map()
/** Color sRGB (0xrrggbb) → [r, g, b] lineal; un array [r, g, b] pasa tal cual (parámetros, no color). */
export function lineal(color) {
  if (Array.isArray(color)) return color
  if (!lineales.has(color)) lineales.set(color, Object.freeze(new Color(color).toArray())) // congelado: es de todos
  return lineales.get(color)
}

/** La matriz local → mundo de un marco: x local sobre el eje (ux, uy) del plano, z local a su derecha. */
export function matrizDeMarco({ x, z }, [ux, uy]) {
  const n = Math.hypot(ux, uy)
  if (!(n > 0)) throw new Error('hito: el eje no puede ser nulo')
  const [ex, ez] = [ux / n, uy / n]
  return new Matrix4().makeBasis(new Vector3(ex, 0, ez), new Vector3(0, 1, 0), new Vector3(-ez, 0, ex)).setPosition(x, 0, z)
}

export function crearLienzo() {
  const b = { posiciones: [], normales: [], colores: [], hitos: [], vidas: [], anclas: [], uvs: [], indices: [] }
  const v = new Vector3()
  const n = new Vector3()

  const pintor = (estado) => {
    const hijo = (cambios) => pintor({ ...estado, ...cambios })
    const origen = () => v.set(0, 0, 0).applyMatrix4(estado.matriz).clone()
    return Object.freeze({
      estado,
      /** Un pintor corrido a (a, h, b) de este y girado `giro` radianes alrededor de la vertical. */
      en: (a = 0, h = 0, bb = 0, giro = 0) => hijo({
        matriz: estado.matriz.clone().multiply(new Matrix4().makeRotationY(giro).setPosition(a, h, bb)),
      }),
      /** Corrido a (a, h, b) y con el frente (+z local) mirando hacia (da, db) de este marco. */
      mirando: (a, h, bb, da, db) => hijo({
        matriz: estado.matriz.clone().multiply(new Matrix4().makeRotationY(Math.atan2(da, db)).setPosition(a, h, bb)),
      }),
      /** Agrandado o achicado parejo (una estatua más grande que el natural). */
      escalado: (k) => hijo({ matriz: estado.matriz.clone().multiply(new Matrix4().makeScale(k, k, k)) }),
      /** Con otra vida (épocas en que está en pie). */
      con: ({ nace, muere }) => hijo({ vida: [nace ?? estado.vida[0], muere ?? estado.vida[1]] }),
      /** Lo que se dibuje se apoya en el terreno bajo el origen de este pintor (un farol, un puesto). */
      apoyado: () => { const o = origen(); return hijo({ apoyo: { x: o.x, z: o.z } }) },
      /** Cada vértice se apoya en el terreno que tiene debajo (rejas, pretiles, losas). */
      siguiendo: () => hijo({ apoyo: PROPIO }),
      /** Pavimentos extensos: cada vértice toma sólo su propia cota, sin terraza horizontal. */
      sobreTerreno: () => hijo({ ancla: PROPIO, apoyo: PROPIO }),
      /**
       * Sobre la rasante de un puente: recta entre el terreno de dos cabezas ([x, z] de este marco). Lo dibujado
       * no sigue el relieve intermedio ni lleva pies; los vértices con el atributo `suelo` en 1 (el pie de un
       * apoyo, el lecho) van con el suelo dibujado que tienen debajo.
       */
      rasante: (desde, hasta) => hijo({
        rasante: [desde, hasta].flatMap(([x, z]) => { const c = new Vector3(x, 0, z).applyMatrix4(estado.matriz); return [c.x, c.z] }),
      }),
      /** Agrega una geometría de three.js (posición y normal; uv opcional) con un color y un material. */
      geo(g, { color = 0xffffff, mat = MAT.LISO, flota = false } = {}) {
        const { position, normal, uv, suelo } = g.attributes
        if (!position || !normal) throw new Error('hito: la geometría necesita position y normal')
        const [r, gg, bl] = lineal(color)
        const base = b.posiciones.length / 3
        const { ancla, apoyo, vida, dist, semilla, matriz, rasante } = estado
        for (let i = 0; i < position.count; i++) {
          v.fromBufferAttribute(position, i)
          v.applyMatrix4(matriz) // el marco no inclina: la altura del mundo es la local
          const alSuelo = rasante && suelo && suelo.getX(i) > 0.5
          const esPie = !rasante && !flota && v.y < UMBRAL_PIE_M
          n.fromBufferAttribute(normal, i).transformDirection(matriz)
          b.posiciones.push(v.x, v.y, v.z)
          b.normales.push(n.x, n.y, n.z)
          b.colores.push(r, gg, bl)
          b.hitos.push(dist, semilla, mat, alSuelo ? APOYO.SUELO : rasante ? APOYO.RASANTE : esPie ? APOYO.PIE : APOYO.NINGUNO)
          b.vidas.push(vida[0], vida[1])
          if (rasante && !alSuelo) b.anclas.push(...rasante)
          else {
            const ap = alSuelo || apoyo === PROPIO ? v : (apoyo ?? ancla)
            const an = alSuelo || ancla === PROPIO ? v : ancla
            b.anclas.push(an.x, an.z, ap.x, ap.z)
          }
          b.uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0)
        }
        if (g.index) for (let i = 0; i < g.index.count; i++) b.indices.push(base + g.index.getX(i))
        else for (let i = 0; i < position.count; i++) b.indices.push(base + i)
        g.dispose()
      },
    })
  }

  return {
    /** El pintor de un hito: origen {x, z} en el mundo, eje (ux, uy), vida y ancla (por omisión, el origen). */
    hito({ origen, eje = [1, 0], nace = 0, muere = 0, semilla = 0, ancla = origen }) {
      return pintor({
        matriz: matrizDeMarco(origen, eje), vida: [nace, muere], ancla, apoyo: null, rasante: null, semilla,
        dist: Math.hypot(origen.x, origen.z),
      })
    },
    get vertices() { return b.posiciones.length / 3 },
    get triangulos() { return b.indices.length / 3 },
    /** Arrays tipados para la BufferGeometry (ver src/hitos.js). */
    datos: () => ({
      posiciones: new Float32Array(b.posiciones), normales: new Float32Array(b.normales),
      colores: new Float32Array(b.colores), hitos: new Float32Array(b.hitos), vidas: new Float32Array(b.vidas),
      anclas: new Float32Array(b.anclas), uvs: new Float32Array(b.uvs), indices: new Uint32Array(b.indices),
    }),
  }
}
