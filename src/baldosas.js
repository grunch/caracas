/**
 * Las casas, repartidas en baldosas: una rejilla de LADO_BALDOSA_M sobre el mundo, con la Plaza Bolívar en el
 * origen. Cada baldosa es una geometría aparte, con lo que se gana tres veces (specs/10-rendimiento.md):
 * - llegan de a una, las del centro primero, en vez de esperar a la ciudad entera;
 * - three.js no dibuja las que quedan fuera de la vista (ni fuera del mapa de sombras);
 * - dentro de cada una, los triángulos van ordenados por la vida de su casa (de qué época a qué época existe) y
 *   solo se mandan a dibujar los tramos que viven en la época que se mira: la malla trae todas las épocas, y al
 *   abrir (1772) vive una octava parte.
 * Lógica pura, sin three.js: corre también en el worker (src/ciudad-pedido.js).
 */

export const LADO_BALDOSA_M = 512

/** Las casas con huella, agrupadas por la baldosa de su centro; las baldosas más cercanas a la plaza, primero. */
export function repartirEnBaldosas(casas, lado = LADO_BALDOSA_M) {
  const porClave = new Map()
  casas.forEach((casa, numero) => {
    if (!casa.huella) return
    const i = Math.floor(casa.centro[0] / lado), j = Math.floor(casa.centro[1] / lado)
    const clave = `${i},${j}`
    const baldosa = porClave.get(clave)
    if (baldosa) baldosa.numeros.push(numero); else porClave.set(clave, { id: clave, i, j, numeros: [numero] })
  })
  const lejania = (b) => Math.hypot((b.i + 0.5) * lado, (b.j + 0.5) * lado)
  return [...porClave.values()].sort((a, b) => lejania(a) - lejania(b) || a.i - b.i || a.j - b.j)
}

/**
 * ¿Se ve algo de una casa que nace en `nace` y muere en `muere` (0 = nunca) mientras la época va de `desde` a
 * `hasta`? Espejo de vivoEn() del shader (src/shader/epocas.js): una casa empieza a aparecer media época antes
 * de nacer y ya no está cuando la época llega a la de su muerte.
 */
export function seVeEntre(nace, muere, desde, hasta) {
  const [lo, hi] = desde <= hasta ? [desde, hasta] : [hasta, desde]
  return hi > nace - 0.5 && (muere === 0 || lo < muere)
}

// el orden de las vidas dentro de una baldosa: primero las casas que no mueren, por época de nacimiento (las
// que viven en una época son entonces un solo tramo seguido); después las que mueren
const ordenDeVida = (nace, muere) => (muere === 0 ? nace : 1000 + nace * 100 + muere)

/**
 * Los triángulos de `indices`, reordenados por la vida de su casa (`vidas`: nace y muere por vértice; los tres
 * vértices de un triángulo son de la misma casa). Devuelve los índices nuevos (del mismo tipo) y los tramos:
 * [{ nace, muere, desde, cuantos }], con `desde` y `cuantos` en índices.
 */
export function ordenarPorVida(indices, vidas) {
  const triangulos = indices.length / 3
  const porVida = new Map()
  for (let t = 0; t < triangulos; t++) {
    const v = indices[t * 3]
    const nace = vidas[v * 2], muere = vidas[v * 2 + 1]
    const clave = ordenDeVida(nace, muere)
    const grupo = porVida.get(clave)
    if (grupo) grupo.cuantos += 3; else porVida.set(clave, { clave, nace, muere, cuantos: 3 })
  }
  const grupos = [...porVida.values()].sort((a, b) => a.clave - b.clave)
  let desde = 0
  for (const g of grupos) { g.desde = desde; g.escrito = desde; desde += g.cuantos }
  const ordenados = new indices.constructor(indices.length)
  for (let t = 0; t < triangulos; t++) {
    const v = indices[t * 3]
    const g = porVida.get(ordenDeVida(vidas[v * 2], vidas[v * 2 + 1]))
    ordenados[g.escrito] = v
    ordenados[g.escrito + 1] = indices[t * 3 + 1]
    ordenados[g.escrito + 2] = indices[t * 3 + 2]
    g.escrito += 3
  }
  return { indices: ordenados, tramos: grupos.map(({ nace, muere, desde, cuantos }) => ({ nace, muere, desde, cuantos })) }
}

/** Los rangos de índices [{ desde, cuantos }] que hay que dibujar mientras la época va de `desde` a `hasta`: los tramos que se ven, juntando los seguidos. */
export function rangosVivos(tramos, desde, hasta) {
  const rangos = []
  for (const t of tramos) {
    if (!seVeEntre(t.nace, t.muere, desde, hasta)) continue
    const ultimo = rangos.at(-1)
    if (ultimo && ultimo.desde + ultimo.cuantos === t.desde) ultimo.cuantos += t.cuantos
    else rangos.push({ desde: t.desde, cuantos: t.cuantos })
  }
  return rangos
}

/**
 * La esfera de una baldosa una vez apoyada en el relieve: sus casas suben, cada una, la altura del terreno en
 * su centro, que dentro de la baldosa va de `yMin` a `yMax` (con la ciudad acostada, 0). `margen`: lo que el
 * terreno puede pasarse entre las muestras con que se midió.
 */
export function esferaSobreRelieve({ centro, radio }, yMin, yMax, margen = 0) {
  const [abajo, arriba] = [Math.min(0, yMin), Math.max(0, yMax)]
  return { centro: [centro[0], centro[1] + (abajo + arriba) / 2, centro[2]], radio: radio + (arriba - abajo) / 2 + margen }
}

/** Entre qué alturas queda el terreno bajo una esfera: `alturaEn(x, z)` muestreada en una rejilla de n × n sobre su cuadrado. */
export function alturasBajo({ centro, radio }, alturaEn, n = 9) {
  let [yMin, yMax] = [Infinity, -Infinity]
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const y = alturaEn(centro[0] + radio * ((2 * i) / (n - 1) - 1), centro[2] + radio * ((2 * j) / (n - 1) - 1))
      if (y < yMin) yMin = y
      if (y > yMax) yMax = y
    }
  }
  return { yMin, yMax }
}
