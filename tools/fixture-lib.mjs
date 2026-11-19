// Recortes para la fixture chica de los E2E (tools/fixture.mjs): lógica pura, sin archivos.

/** Un cuadrado de `ladoM` metros alrededor de la plaza ([px, py]), en píxeles del plano (`metro` m/px). */
export function cajaAlrededor([px, py], metro, ladoM) {
  const r = ladoM / 2 / metro
  return { x0: px - r, y0: py - r, x1: px + r, y1: py + r }
}

const adentro = ({ x0, y0, x1, y1 }, x, y) => x >= x0 && x < x1 && y >= y0 && y < y1

/**
 * La ciudad del pipeline (el JSON que lee tools/empacar-lib.mjs) con solo las casas cuyo centro cae en la
 * caja: vértices corridos, listas por techo filtradas, marcos que apuntan al techo nuevo y sus alas juntas.
 * No toca el original.
 */
export function recortarCiudad(ciudad, caja) {
  const { vertices, techos } = ciudad
  const quedan = []
  techos.forEach(([inicio, cuantos], k) => {
    let sx = 0
    let sy = 0
    for (let i = inicio; i < inicio + cuantos; i++) { sx += vertices[2 * i]; sy += vertices[2 * i + 1] }
    if (adentro(caja, sx / cuantos, sy / cuantos)) quedan.push(k)
  })
  const nuevo = new Map(quedan.map((k, j) => [k, j]))
  const nuevosVertices = []
  const nuevosTechos = quedan.map((k) => {
    const [inicio, cuantos, ...resto] = techos[k]
    const desde = nuevosVertices.length / 2
    nuevosVertices.push(...vertices.slice(2 * inicio, 2 * (inicio + cuantos)))
    return [desde, cuantos, ...resto]
  })
  const salida = { ...ciudad, vertices: nuevosVertices, techos: nuevosTechos }
  for (const clave of ['vida', 'historia', 'esquinas', 'cuadras', 'cede', 'junta', 'antes']) {
    if (Array.isArray(ciudad[clave]) && ciudad[clave].length === techos.length) salida[clave] = quedan.map((k) => ciudad[clave][k])
  }
  if (ciudad.marcos) {
    const alas = []
    salida.marcos = ciudad.marcos.filter((m) => nuevo.has(m[0])).map((m) => {
      const [techo, ...medio] = m.slice(0, 9)
      const [primera, cuantas] = m.slice(9)
      const desde = alas.length
      alas.push(...ciudad.alas.slice(primera, primera + cuantas))
      return [nuevo.get(techo), ...medio, desde, cuantas]
    })
    salida.alas = alas
  }
  return salida
}

const BYTES_POR_ARBOL = 8 // src/arboles.js: x, y (u16), radio (u16, dm), vida (u16)

/** Los árboles (arboles.bin) cuyo (x, y) cae en la caja: los registros tal cual. */
export function recortarArboles(bytes, caja) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const salida = []
  for (let o = 0; o + BYTES_POR_ARBOL <= bytes.byteLength; o += BYTES_POR_ARBOL) {
    if (adentro(caja, v.getUint16(o, true), v.getUint16(o + 2, true))) salida.push(bytes.subarray(o, o + BYTES_POR_ARBOL))
  }
  const recorte = new Uint8Array(salida.length * BYTES_POR_ARBOL)
  salida.forEach((r, i) => recorte.set(r, i * BYTES_POR_ARBOL))
  return recorte
}

/** El relieve (relieve.bin: u16 ancho, u16 alto, alturas u16 en dm) `factor` veces más chico, con el promedio. */
export function reducirRelieve(bytes, factor) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const [w, h] = [v.getUint16(0, true), v.getUint16(2, true)]
  const [w2, h2] = [Math.floor(w / factor), Math.floor(h / factor)]
  const salida = new Uint8Array(4 + 2 * w2 * h2)
  const s = new DataView(salida.buffer)
  s.setUint16(0, w2, true)
  s.setUint16(2, h2, true)
  for (let j = 0; j < h2; j++) {
    for (let i = 0; i < w2; i++) {
      let suma = 0
      for (let dj = 0; dj < factor; dj++) {
        for (let di = 0; di < factor; di++) suma += v.getUint16(4 + 2 * ((j * factor + dj) * w + i * factor + di), true)
      }
      s.setUint16(4 + 2 * (j * w2 + i), Math.round(suma / factor ** 2), true)
    }
  }
  return salida
}

/** El índice de los planos de época (plano/epocas.json) con un solo nivel por plano, del `lado` reducido. */
export function nivelesReducidos(epocas, lado) {
  return { ...epocas, planos: epocas.planos.map((p) => ({ ...p, niveles: [{ ...p.niveles[0], lado }] })) }
}

/** ¿La tesela (col, fila) de `lado` píxeles del plano (plano/laminas.json) toca la caja? */
export function teselaToca(col, fila, lado, { x0, y0, x1, y1 }) {
  return col * lado < x1 && (col + 1) * lado > x0 && fila * lado < y1 && (fila + 1) * lado > y0
}
