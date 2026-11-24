import { describe, test, expect } from 'vitest'
import { BufferGeometry, BufferAttribute } from 'three'
import {
  extruirTechos, prepararCasas, extruirCasas, esferaDe, paqueteDeGeometria, transferiblesDe, ATRIBUTOS,
  empacarTecho, desempacarTecho, marcoDelLote, alinearHuella,
} from '../../src/ciudad.js'
import { geometriaCiudad, geometriaDePaquete } from '../../src/ciudad-geometria.js'
import { CUBIERTA, altoDePiso } from '../../src/techos.js'
import { rectanguloMinimo } from '../../src/poligono.js'

const COLONIAL = 0, REPUBLICANO = 1, MODERNO = 4
const METRO = 0.5
const coords = { aMundo: (px, py) => ({ x: px * METRO, z: py * METRO }) }

/** Arma los datos del pak a partir de casas { puntos: [[x, z] en metros…], estilo, pisos, semilla, vida }. */
function ciudadDe(casas) {
  const vertices = []
  const techos = []
  const vida = []
  for (const { puntos, estilo = COLONIAL, pisos = 1, semilla = 7, nace = 1, muere = 0 } of casas) {
    techos.push(vertices.length / 2, puntos.length, empacarTecho({ pisos, estilo }), semilla)
    for (const [x, z] of puntos) vertices.push(x / METRO, z / METRO)
    vida.push(nace + 8 * muere)
  }
  return { vertices: new Float32Array(vertices), techos: new Uint32Array(techos), vida: new Uint32Array(vida) }
}
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]

/** Los vértices de la geometría como objetos, para preguntar cómodo. */
function vertices(g) {
  return Array.from({ length: g.posiciones.length / 3 }, (_, v) => ({
    x: g.posiciones[v * 3], y: g.posiciones[v * 3 + 1], z: g.posiciones[v * 3 + 2],
    n: [g.normales[v * 3], g.normales[v * 3 + 1], g.normales[v * 3 + 2]],
    semilla: g.info[v * 4 + 1], estilo: g.info[v * 4 + 2],
    pared: [g.paredes[v * 3], g.paredes[v * 3 + 1], g.paredes[v * 3 + 2]],
    faldon: [g.cubiertas[v * 4], g.cubiertas[v * 4 + 1], g.cubiertas[v * 4 + 2]], cubierta: g.cubiertas[v * 4 + 3],
  }))
}
const esPared = (v) => v.cubierta === CUBIERTA.PARED

// una cuadra: tres casas de 10 m de frente y 24 de fondo sobre la calle (z < 0), y otras tres a sus espaldas
const SEMILLA_DEL_MEDIO = 11
const cuadra = (estilo) => ciudadDe([
  { puntos: rect(0, 0, 10, 24), estilo, semilla: 5 },
  { puntos: rect(10, 0, 20, 24), estilo, semilla: SEMILLA_DEL_MEDIO },
  { puntos: rect(20, 0, 30, 24), estilo, semilla: 6 },
  { puntos: rect(0, 24, 10, 48), estilo, semilla: 8 },
  { puntos: rect(10, 24, 20, 48), estilo, semilla: 9 },
  { puntos: rect(20, 24, 30, 48), estilo, semilla: 10 },
])
const delMedio = (g) => vertices(g).filter((v) => v.semilla === SEMILLA_DEL_MEDIO)

describe('empacarTecho', () => {
  test('ida y vuelta de pisos y estilo', () => {
    expect(desempacarTecho(empacarTecho({ pisos: 9, estilo: 8 }))).toEqual({ pisos: 9, estilo: 8 })
  })
})

describe('extruirTechos: los búferes', () => {
  const g = extruirTechos(cuadra(COLONIAL), coords)
  const n = g.posiciones.length / 3

  test('un valor por vértice en cada atributo, y los índices apuntan a vértices que existen', () => {
    expect(n).toBeGreaterThan(0)
    expect(g.normales.length).toBe(n * 3)
    expect(g.info.length).toBe(n * 4)
    expect(g.vidas.length).toBe(n * 2)
    expect(g.anclas.length).toBe(n * 2)
    expect(g.paredes.length).toBe(n * 3)
    expect(g.cubiertas.length).toBe(n * 4)
    expect(g.indices.length % 3).toBe(0)
    expect(Math.max(...g.indices)).toBeLessThan(n)
    for (const a of [g.posiciones, g.normales, g.paredes, g.cubiertas]) expect(a.every(Number.isFinite)).toBe(true)
  })

  test('es determinista: los mismos datos dan la misma geometría', () => {
    const otra = extruirTechos(cuadra(COLONIAL), coords)
    expect(otra.posiciones).toEqual(g.posiciones)
    expect(otra.indices).toEqual(g.indices)
    expect(otra.cubiertas).toEqual(g.cubiertas)
  })

  test('cada triángulo mira hacia donde dice su normal', () => {
    const p = (i) => [g.posiciones[i * 3], g.posiciones[i * 3 + 1], g.posiciones[i * 3 + 2]]
    let alReves = 0
    for (let t = 0; t < g.indices.length; t += 3) {
      const [a, b, c] = [p(g.indices[t]), p(g.indices[t + 1]), p(g.indices[t + 2])]
      const [u, v] = [[b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]]
      const cruz = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const k = g.indices[t] * 3
      if (cruz[0] * g.normales[k] + cruz[1] * g.normales[k + 1] + cruz[2] * g.normales[k + 2] < -1e-6) alReves++
    }
    expect(alReves).toBe(0)
  })

  test('aInfo lleva la distancia a la plaza, la semilla, el estilo y los pisos; aAncla, el centroide de la casa', () => {
    const sola = extruirTechos(ciudadDe([{ puntos: rect(0, 0, 5, 5), estilo: REPUBLICANO, pisos: 2, semilla: 123 }]), coords)
    for (let v = 0; v < sola.posiciones.length / 3; v++) {
      expect(sola.info[v * 4]).toBeCloseTo(Math.hypot(2.5, 2.5), 3)
      expect([sola.info[v * 4 + 1], sola.info[v * 4 + 2], sola.info[v * 4 + 3]]).toEqual([123, REPUBLICANO, 2])
      expect([sola.anclas[v * 2], sola.anclas[v * 2 + 1]]).toEqual([2.5, 2.5])
    }
  })

  test('cada vértice lleva [nace, muere] de su casa; sin vida, [0, 0] (siempre visible)', () => {
    const datos = ciudadDe([{ puntos: rect(0, 0, 5, 5), nace: 2 }, { puntos: rect(40, 0, 45, 5), nace: 0, muere: 4 }])
    const con = extruirTechos(datos, coords)
    const pares = new Set()
    for (let v = 0; v < con.vidas.length / 2; v++) pares.add(`${con.vidas[v * 2]},${con.vidas[v * 2 + 1]}`)
    expect([...pares].sort()).toEqual(['0,4', '2,0'])
    const sin = extruirTechos({ vertices: datos.vertices, techos: datos.techos }, coords)
    expect(Array.from(new Set(sin.vidas))).toEqual([0])
  })

  test('acepta polígonos en ambos sentidos de giro', () => {
    const derecho = extruirTechos(ciudadDe([{ puntos: rect(0, 0, 10, 8) }]), coords)
    const inverso = extruirTechos(ciudadDe([{ puntos: rect(0, 0, 10, 8).reverse() }]), coords)
    expect(inverso.indices.length).toBe(derecho.indices.length)
  })

  test('las huellas que no dan un polígono se saltean sin romper', () => {
    const datos = ciudadDe([{ puntos: [[0, 0], [5, 0]] }, { puntos: [[0, 0], [5, 0], [10, 0]] }, { puntos: rect(20, 0, 30, 8) }])
    const g2 = extruirTechos(datos, coords)
    expect(g2.indices.length).toBeGreaterThan(0)
    expect(new Set(vertices(g2).map((v) => Math.round(v.x / 20)))).toEqual(new Set([1, 2])) // solo la tercera (x de 20 a 30)
  })

  test('sin casas, búferes vacíos', () => {
    const vacio = extruirTechos({ vertices: new Float32Array(0), techos: new Uint32Array(0) }, coords)
    expect(vacio.posiciones.length).toBe(0)
    expect(vacio.indices.length).toBe(0)
  })
})

describe('extruirTechos: la casa colonial entre medianeras', () => {
  const g = extruirTechos(cuadra(COLONIAL), coords)
  const casa = delMedio(g)
  const alto = altoDePiso(COLONIAL, SEMILLA_DEL_MEDIO)
  const tejas = casa.filter((v) => v.cubierta === CUBIERTA.TEJA || v.cubierta === CUBIERTA.TEJA + CUBIERTA.VOLADA)

  test('la pared del frente va del suelo a pisos × alto de piso de la casa', () => {
    const frente = casa.filter((v) => esPared(v) && Math.abs(v.z) < 1e-4 && v.n[2] < -0.9)
    expect(frente.length).toBeGreaterThanOrEqual(4)
    expect(Math.min(...frente.map((v) => v.y))).toBe(0)
    expect(Math.max(...frente.map((v) => v.y))).toBeCloseTo(alto, 4)
    for (const v of frente) expect(v.pared[2]).toBeCloseTo(alto, 4) // y la fachada sabe su alto de piso
  })

  test('la cumbrera es paralela a la calle: los puntos más altos del tejado corren a lo largo del frente', () => {
    const cumbre = Math.max(...tejas.map((v) => v.y))
    const arriba = tejas.filter((v) => v.y > cumbre - 1e-3)
    const [xs, zs] = [arriba.map((v) => v.x), arriba.map((v) => v.z)]
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(10, 3) // de medianera a medianera
    expect(Math.max(...zs) - Math.min(...zs)).toBeLessThan(1e-3) // a una sola distancia de la calle
    expect(zs[0]).toBeGreaterThanOrEqual(3) // en el medio de una crujía de 6 a 7,5 m
    expect(zs[0]).toBeLessThanOrEqual(3.75)
    expect(cumbre).toBeGreaterThan(alto + 1.2)
  })

  test('los faldones miran hacia arriba, inclinados 24° a 30° los de la crujía', () => {
    for (const v of tejas) expect(v.n[1]).toBeGreaterThan(0.8)
    const frente = tejas.filter((v) => v.n[2] < -0.3 && v.z < 4) // el faldón que cae a la calle
    expect(frente.length).toBeGreaterThan(0)
    for (const v of frente) {
      const grados = (Math.acos(v.n[1]) * 180) / Math.PI
      expect(grados).toBeGreaterThanOrEqual(24 - 1e-3)
      expect(grados).toBeLessThanOrEqual(30 + 1e-3)
    }
  })

  test('el alero vuela 0,5 a 0,8 m sobre la calle, más bajo que la pared, con su cara de abajo', () => {
    const vuelo = -Math.min(...tejas.map((v) => v.z))
    expect(vuelo).toBeGreaterThanOrEqual(0.5 - 1e-3)
    expect(vuelo).toBeLessThanOrEqual(0.8 + 1e-3)
    const punta = tejas.filter((v) => v.z < -0.4)
    for (const v of punta) expect(v.y).toBeLessThan(alto)
    expect(punta.every((v) => v.cubierta === CUBIERTA.TEJA + CUBIERTA.VOLADA)).toBe(true) // marcado: el shader lo quita si hay pretil
    const debajo = casa.filter((v) => v.cubierta === CUBIERTA.ALERO)
    expect(debajo.length).toBeGreaterThanOrEqual(4)
    for (const v of debajo) expect(v.n[1]).toBe(-1)
    // hacia los vecinos y hacia el fondo no vuela nada
    expect(Math.min(...casa.map((v) => v.x))).toBeGreaterThanOrEqual(10 - 1e-4)
    expect(Math.max(...casa.map((v) => v.x))).toBeLessThanOrEqual(20 + 1e-4)
    expect(Math.max(...casa.map((v) => v.z))).toBeLessThanOrEqual(24 + 1e-4)
  })

  test('las coordenadas del tejado: t baja desde la cumbrera (0) hasta el largo del faldón, alero incluido', () => {
    for (const v of tejas) {
      expect(v.faldon[1]).toBeGreaterThanOrEqual(-1e-4)
      expect(v.faldon[1]).toBeLessThanOrEqual(v.faldon[2] + 1e-4)
    }
    const cumbre = Math.max(...tejas.map((v) => v.y))
    for (const v of tejas.filter((q) => q.y > cumbre - 1e-3)) expect(v.faldon[1]).toBeCloseTo(0, 4)
    const punta = tejas.filter((v) => v.z < -0.4)
    for (const v of punta) expect(v.faldon[1]).toBeCloseTo(v.faldon[2], 3) // la punta del alero es el final del faldón
  })

  test('sin marco ni alas no se inventan patios: la casa queda techada entera', () => {
    const p = (i) => ({ x: g.posiciones[i * 3], z: g.posiciones[i * 3 + 2] })
    let techado = 0
    for (let t = 0; t < g.indices.length; t += 3) {
      const [i, j, k] = [g.indices[t], g.indices[t + 1], g.indices[t + 2]]
      if (g.info[i * 4 + 1] !== SEMILLA_DEL_MEDIO || g.cubiertas[i * 4 + 3] !== CUBIERTA.TEJA || g.normales[i * 3 + 1] < 0) continue
      const [a, b, c] = [p(i), p(j), p(k)]
      if (Math.min(a.z, b.z, c.z) < -1e-3) continue // el alero no cuenta
      techado += Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)) / 2
    }
    expect(techado).toBeCloseTo(10 * 24, 3)
    expect(casa.some((v) => v.cubierta === CUBIERTA.PATIO)).toBe(false)
  })
})

describe('extruirTechos: según el estilo', () => {
  test('republicana: nada vuela sobre la calle, y la pared del frente sube 0,75 m de pretil sobre el arranque del tejado', () => {
    const casa = delMedio(extruirTechos(cuadra(REPUBLICANO), coords))
    const alto = altoDePiso(REPUBLICANO, SEMILLA_DEL_MEDIO)
    expect(Math.min(...casa.map((v) => v.z))).toBeGreaterThanOrEqual(-1e-4)
    expect(casa.some((v) => v.cubierta === CUBIERTA.ALERO)).toBe(false)
    // el tejado arranca a la altura de la casa, en la línea del frente
    const arranque = casa.filter((v) => v.cubierta === CUBIERTA.TEJA && Math.abs(v.z) < 1e-4)
    expect(arranque.length).toBeGreaterThan(0)
    for (const v of arranque) expect(v.y).toBeCloseTo(alto, 3)
    // los vértices de arriba de la pared del frente suben con el pretil (lo aplica el shader); los del pie, no
    const frente = casa.filter((v) => esPared(v) && Math.abs(v.z) < 1e-4 && v.n[2] < -0.9)
    for (const v of frente) expect(v.faldon[0]).toBe(v.y > 0.1 ? 0.75 : 0)
    for (const v of frente) expect(v.faldon[1]).toBe(0.75) // toda la pared sabe que lleva pretil (para su fachada)
    // el pretil tiene cara de adentro: un paño sobre la línea del frente que mira hacia el fondo y nace sin altura
    const adentro = casa.filter((v) => esPared(v) && Math.abs(v.z) < 1e-4 && v.n[2] > 0.9)
    expect(adentro.length).toBeGreaterThanOrEqual(4)
    expect(new Set(adentro.map((v) => v.faldon[0]))).toEqual(new Set([0, 0.75]))
    for (const v of adentro) expect(v.y).toBeCloseTo(alto, 3)
    // las medianeras no llevan pretil
    expect(casa.some((v) => esPared(v) && Math.abs(v.n[0]) > 0.9 && v.faldon[1] > 0)).toBe(false)
  })

  test('moderna: azotea plana, más baja que el pretil que la rodea', () => {
    const g = extruirTechos(ciudadDe([{ puntos: rect(0, 0, 6, 6), estilo: MODERNO, pisos: 3, semilla: 4, nace: 5 }]), coords)
    const alto = 3 * altoDePiso(MODERNO, 4)
    const losa = vertices(g).filter((v) => v.cubierta === CUBIERTA.AZOTEA)
    expect(losa.length).toBeGreaterThanOrEqual(4)
    for (const v of losa) {
      expect(v.n).toEqual([0, 1, 0])
      expect(v.y).toBeCloseTo(alto - 0.7, 3)
    }
    expect(Math.max(...vertices(g).filter(esPared).map((v) => v.y))).toBeCloseTo(alto, 3)
  })
})

describe('extruirTechos: la fachada de cada pared (aPared)', () => {
  const g = extruirTechos(ciudadDe([{ puntos: rect(0, 0, 10, 8), semilla: 3 }]), coords)
  const todos = vertices(g)

  test('los tejados no llevan pared (largo 0) y las paredes no llevan cubierta', () => {
    for (const v of todos.filter((q) => !esPared(q))) expect(v.pared[1]).toBe(0)
    expect(todos.filter(esPared).every((v) => v.faldon[2] === 0)).toBe(true)
    for (const v of todos.filter(esPared)) expect(Math.abs(v.n[1])).toBeLessThan(1e-6)
  })

  test('cada pared lleva su largo en metros, u va de 0 a ese largo y el alto de piso es el de la casa', () => {
    const paredes = todos.filter((v) => esPared(v) && v.pared[1] > 0)
    expect(new Set(paredes.map((v) => +v.pared[1].toFixed(3)))).toEqual(new Set([8, 10]))
    for (const v of paredes) {
      expect(v.pared[0]).toBeGreaterThanOrEqual(0)
      expect(v.pared[0]).toBeLessThanOrEqual(v.pared[1] + 1e-5)
      expect(v.pared[2]).toBeCloseTo(altoDePiso(COLONIAL, 3), 4)
    }
  })

  test('u crece a lo largo de cada pared: es la distancia en planta', () => {
    let vistos = 0
    for (let t = 0; t < g.indices.length; t += 3) {
      const [a, b, c] = [todos[g.indices[t]], todos[g.indices[t + 1]], todos[g.indices[t + 2]]]
      if (!esPared(a) || a.pared[1] === 0) continue
      for (const [p, q] of [[a, b], [b, c], [a, c]]) {
        expect(Math.abs(p.pared[0] - q.pared[0])).toBeCloseTo(Math.hypot(p.x - q.x, p.z - q.z), 4)
      }
      vistos++
    }
    expect(vistos).toBeGreaterThanOrEqual(8)
  })

  test('las paredes miran hacia afuera', () => {
    for (const v of todos.filter(esPared)) expect((v.x - 5) * v.n[0] + (v.z - 4) * v.n[2]).toBeGreaterThan(0)
  })

  test('los hastiales suben hasta la cumbrera: la pared de la medianera pasa de la altura del alero', () => {
    // una casa cuadrada no lleva caderas: sus costados son hastiales
    const casa = vertices(extruirTechos(ciudadDe([{ puntos: rect(0, 0, 8, 8), semilla: 3 }]), coords))
    const alto = altoDePiso(COLONIAL, 3)
    const cumbre = Math.max(...casa.filter((v) => v.cubierta === CUBIERTA.TEJA).map((v) => v.y))
    expect(Math.max(...casa.filter(esPared).map((v) => v.y))).toBeCloseTo(cumbre, 4)
    expect(cumbre).toBeGreaterThan(alto + 1)
  })

  test('una casa larga y suelta lleva caderas (cuatro aguas): ninguna pared pasa de la altura del alero', () => {
    const alto = altoDePiso(COLONIAL, 3)
    expect(Math.max(...todos.filter(esPared).map((v) => v.y))).toBeCloseTo(alto, 4)
    expect(todos.some((v) => v.cubierta === CUBIERTA.TEJA && Math.abs(v.n[0]) > 0.3)).toBe(true)
  })
})

describe('extruirTechos: huellas dentadas e irregulares', () => {
  test('los dientes que sobresalen se quitan y el techo nunca sale de la huella (T33j.6b)', () => {
    const dentada = [[0, 0], [3, 0.2], [6, -0.2], [10, 0], [10.2, 4], [10, 8], [5, 8.2], [0, 8], [-0.2, 3]]
    const g = extruirTechos(ciudadDe([{ puntos: dentada }]), coords)
    // sin tolerancia, cada diente es una pared más
    expect(extruirTechos(ciudadDe([{ puntos: dentada }]), coords, { tolerancia: 0 }).indices.length).toBeGreaterThan(g.indices.length)
    // los que entran quedan: quitarlos agrandaría el techo sobre la vecina
    const tejas = vertices(g).filter((v) => v.cubierta === CUBIERTA.TEJA)
    expect(tejas.length).toBeGreaterThan(0)
    for (const v of tejas) expect(v.z).toBeGreaterThanOrEqual(-0.2 - 1e-6)
    expect(Math.min(...tejas.map((v) => v.x))).toBeGreaterThanOrEqual(-0.2 - 1e-6)
  })

  test('un polígono irregular (una U) cae en crujías bajas: sin patio, tejado solo sobre la huella', () => {
    const u = [[0, 0], [30, 0], [30, 24], [24, 24], [24, 4], [6, 4], [6, 24], [0, 24]]
    const g = extruirTechos(ciudadDe([{ puntos: u, semilla: 9 }]), coords)
    const todos = vertices(g)
    const alto = altoDePiso(COLONIAL, 9)
    const tejas = todos.filter((v) => v.cubierta === CUBIERTA.TEJA && v.n[1] > 0)
    expect(tejas.length).toBeGreaterThan(8)
    expect(Math.max(...tejas.map((v) => v.y))).toBeLessThanOrEqual(alto + 1.6 + 1e-3)
    // ningún tejado sobre el hueco de la U
    expect(tejas.some((v) => v.x > 6.5 && v.x < 23.5 && v.z > 4.5 && v.z < 30)).toBe(false)
  })
})

describe('extruirTechos: el frente', () => {
  test('una casa suelta pone la cumbrera a lo largo de su lado largo', () => {
    const g = extruirTechos(ciudadDe([{ puntos: rect(0, 0, 6, 14) }]), coords)
    const tejas = vertices(g).filter((v) => v.cubierta === CUBIERTA.TEJA && v.n[1] > 0)
    const cumbre = Math.max(...tejas.map((v) => v.y))
    const arriba = tejas.filter((v) => v.y > cumbre - 1e-3)
    expect(Math.max(...arriba.map((v) => v.z)) - Math.min(...arriba.map((v) => v.z))).toBeGreaterThan(5)
    expect(Math.max(...arriba.map((v) => v.x)) - Math.min(...arriba.map((v) => v.x))).toBeLessThan(1e-3)
  })

  test('las casas de la fundación (que mueren) no cuentan como vecinas de las que vienen después', () => {
    // una casa vieja, que muere en 1843, ocupa la calle de la cuadra: el frente sigue dando a z < 0
    const datos = cuadra(COLONIAL)
    const vieja = ciudadDe([{ puntos: rect(-5, -12, 35, -1), nace: 0, muere: 2, semilla: 99 }])
    const junto = {
      vertices: new Float32Array([...datos.vertices, ...vieja.vertices]),
      techos: new Uint32Array([...datos.techos, datos.vertices.length / 2, 4, vieja.techos[2], 99]),
      vida: new Uint32Array([...datos.vida, ...vieja.vida]),
    }
    const con = delMedio(extruirTechos(junto, coords))
    const sin = delMedio(extruirTechos(datos, coords))
    expect(con.map((v) => [v.x, v.y, v.z])).toEqual(sin.map((v) => [v.x, v.y, v.z]))
  })
})

describe('marcoDelLote', () => {
  const r = rectanguloMinimo(rect(2, 3, 12, 9)) // 10 × 6

  test('para cada lado elegido como frente: origen en una esquina, eu a lo largo del frente y ev hacia adentro', () => {
    for (let frente = 0; frente < 4; frente++) {
      const m = marcoDelLote(r, frente)
      expect(Math.hypot(...m.eu)).toBeCloseTo(1, 9)
      expect(m.eu[0] * m.ev[0] + m.eu[1] * m.ev[1]).toBeCloseTo(0, 9)
      expect(m.ancho * m.fondo).toBeCloseTo(60, 6)
      // el centro del lote cae adentro: a medio ancho y medio fondo del origen
      const centro = [m.origen[0] + (m.eu[0] * m.ancho + m.ev[0] * m.fondo) / 2, m.origen[1] + (m.eu[1] * m.ancho + m.ev[1] * m.fondo) / 2]
      expect(centro[0]).toBeCloseTo(7, 6)
      expect(centro[1]).toBeCloseTo(6, 6)
    }
  })

  test('el ancho es el largo del lado del frente', () => {
    const anchos = [0, 1, 2, 3].map((k) => marcoDelLote(r, k).ancho)
    expect(anchos[0]).toBeCloseTo(anchos[2], 9)
    expect(anchos[1]).toBeCloseTo(anchos[3], 9)
    expect(anchos[0] + anchos[1]).toBeCloseTo(16, 6)
  })
})

import { EPOCAS_HISTORIA, empacarHistoria, historiaEnEpoca } from '../../src/ciudad.js'

describe('historia: estilo y pisos por época', () => {
  // la primera: colonial de un piso hasta 1843, republicana en 1889 y 1911, y de dos pisos en 1936;
  // la segunda: siempre colonial de un piso
  const datos = ciudadDe([{ puntos: rect(0, 0, 10, 8), semilla: 21, nace: 1 }, { puntos: rect(40, 0, 50, 8), semilla: 22, nace: 1 }])
  const historia = new Uint8Array([16, 16, 16, 17, 17, 33, 16, 16, 16, 16, 16, 16])
  const g = extruirTechos({ ...datos, historia }, coords)
  const deLaCasa = (semilla) => vertices(g).map((v, k) => ({ ...v, k })).filter((v) => v.semilla === semilla)

  test('empacarHistoria mete tres épocas en cada número y historiaEnEpoca las saca', () => {
    const bytes = [16, 16, 17, 17, 34, 57]
    const h = empacarHistoria(bytes)
    expect(h).toEqual([16 + 256 * 16 + 65536 * 17, 17 + 256 * 34 + 65536 * 57])
    expect(h.every((v) => Math.fround(v) === v)).toBe(true) // exactos en Float32
    expect(Math.fround(255 + 256 * 255 + 65536 * 255)).toBe(16777215)
    expect(bytes.map((_, e) => historiaEnEpoca(h, e))).toEqual([
      { estilo: 0, pisos: 1 }, { estilo: 0, pisos: 1 }, { estilo: 1, pisos: 1 },
      { estilo: 1, pisos: 1 }, { estilo: 2, pisos: 2 }, { estilo: 9, pisos: 3 },
    ])
    expect(EPOCAS_HISTORIA).toBe(6)
  })

  test('fuera de las épocas rige la más cercana (99 = sin línea de tiempo: la última)', () => {
    const h = empacarHistoria([16, 16, 17, 17, 34, 57])
    expect(historiaEnEpoca(h, 99)).toEqual({ estilo: 9, pisos: 3 })
    expect(historiaEnEpoca(h, -1)).toEqual({ estilo: 0, pisos: 1 })
    expect(historiaEnEpoca(h, 3.6)).toEqual({ estilo: 2, pisos: 2 })
  })

  test('cada vértice lleva la historia de su casa (aHistoria, 2 números)', () => {
    expect(g.historias.length / 2).toBe(g.posiciones.length / 3)
    const primera = empacarHistoria([16, 16, 16, 17, 17, 33])
    for (const v of deLaCasa(21)) expect([g.historias[v.k * 2], g.historias[v.k * 2 + 1]]).toEqual(primera)
    const segunda = empacarHistoria([16, 16, 16, 16, 16, 16])
    for (const v of deLaCasa(22)) expect([g.historias[v.k * 2], g.historias[v.k * 2 + 1]]).toEqual(segunda)
  })

  test('cambiar de fachada no rehace la casa; cambiar de pisos sí: una etapa nueva, con su vida', () => {
    const vidas = new Set(deLaCasa(21).map((v) => `${g.vidas[v.k * 2]},${g.vidas[v.k * 2 + 1]}`))
    expect([...vidas].sort()).toEqual(['1,5', '5,0']) // colonial → republicana (1 a 4) y, en 1936, la de dos pisos
    expect(new Set(deLaCasa(22).map((v) => `${g.vidas[v.k * 2]},${g.vidas[v.k * 2 + 1]}`))).toEqual(new Set(['1,0']))
    // cada etapa va hecha con sus pisos: el shader no tiene que estirarla (aInfo.w = pisos de la etapa)
    const pisosPorVida = new Set(deLaCasa(21).map((v) => `${g.vidas[v.k * 2]}:${g.info[v.k * 4 + 3]}`))
    expect([...pisosPorVida].sort()).toEqual(['1:1', '5:2'])
    const altoDe = (nace) => Math.max(...deLaCasa(21).filter((v) => g.vidas[v.k * 2] === nace && esPared(v) && v.pared[1] > 0).map((v) => v.y))
    expect(altoDe(5)).toBeGreaterThan(altoDe(1) * 1.5)
  })

  test('la etapa que pasa de colonial a republicana lleva las dos cosas: alero, y pretil para cuando le toque', () => {
    const etapa = deLaCasa(21).filter((v) => g.vidas[v.k * 2] === 1)
    expect(etapa.some((v) => v.cubierta === CUBIERTA.ALERO)).toBe(true)
    expect(etapa.some((v) => v.cubierta === CUBIERTA.TEJA + CUBIERTA.VOLADA)).toBe(true)
    // el pretil: vértices de pared que suben 0,75 m cuando la época lo pide (aTecho.x), en paredes marcadas (aTecho.y)
    const suben = etapa.filter((v) => esPared(v) && v.faldon[0] > 0)
    expect(suben.length).toBeGreaterThanOrEqual(4)
    for (const v of suben) expect(v.faldon.slice(0, 2)).toEqual([0.75, 0.75])
    // la que es siempre colonial no lleva pretil
    expect(deLaCasa(22).some((v) => esPared(v) && v.faldon[1] > 0)).toBe(false)
  })

  test('sin historia, todas las épocas valen lo que dice "techos"', () => {
    const sin = extruirTechos(ciudadDe([{ puntos: rect(0, 0, 10, 8), estilo: REPUBLICANO, pisos: 2 }]), coords)
    expect([sin.historias[0], sin.historias[1]]).toEqual(empacarHistoria(Array(6).fill(1 + 16 * 2)))
    expect(historiaEnEpoca([sin.historias[0], sin.historias[1]], 0)).toEqual({ estilo: 1, pisos: 2 })
  })

  test('una historia que no acompaña a los techos falla claro', () => {
    expect(() => extruirTechos({ ...datos, historia: new Uint8Array(6) }, coords)).toThrow(/historia/)
  })
})

describe('geometriaCiudad', () => {
  const g = geometriaCiudad(cuadra(COLONIAL), coords)
  const n = g.attributes.position.count

  test('una sola geometría con todos los atributos que lee el shader', () => {
    const tamaños = { position: 3, normal: 3, aInfo: 4, aVida: 2, aAncla: 2, aPared: 3, aTecho: 4, aHistoria: 2 }
    for (const [nombre, tamaño] of Object.entries(tamaños)) {
      expect(g.attributes[nombre].itemSize, nombre).toBe(tamaño)
      expect(g.attributes[nombre].count, nombre).toBe(n)
    }
    expect(g.index.count % 3).toBe(0)
    expect(g.boundingSphere.radius).toBeGreaterThan(20)
  })

  test('las normales van en un byte por componente (normalizado) y la vida en bytes: son millones de vértices', () => {
    expect(g.attributes.normal.array).toBeInstanceOf(Int8Array)
    expect(g.attributes.normal.normalized).toBe(true)
    expect(g.attributes.aVida.array).toBeInstanceOf(Uint8Array)
    const crudo = extruirTechos(cuadra(COLONIAL), coords)
    for (let k = 0; k < 300; k++) expect(g.attributes.normal.array[k] / 127).toBeCloseTo(crudo.normales[k], 1)
  })
})

describe('extruirTechos: sin triángulos degenerados (T33j.6d)', () => {
  test('ningún triángulo de techo es una aguja de menos de 1 mm de alto', () => {
    // la casa 14654 de la ciudad de 1772 (llevada al origen): un lote triangular con su marco y un ala; el recorte de
    // los faldones con la huella dejaba vértices casi alineados y la triangulación, agujas
    const g = extruirTechos({
      vertices: Float32Array.from([4.414, 31.545, 26.671, 36.997, 9.657, 10.141]),
      techos: Uint32Array.from([0, 3, 2, 13192]), vida: Uint32Array.from([1]),
      marcos: Float32Array.from([0, 26.67, 37.0, -0.97129, -0.23791, 22.91, 22.04, 0, 16.66, 0, 1]),
      alas: Float32Array.from([2, 0, 0, 22.91, 22.04]),
    }, coords)
    sinAgujas(g)
  })

  test('un vértice que pasa la cumbrera por menos de 1 mm no la parte en una tira plana sin ancho', () => {
    // la casa 13841 de la ciudad de 1772, de patio, con sus cinco alas, donde está: lejos del origen, la precisión de
    // Float32 deja el vértice a décimas de milímetro de la cumbrera
    const plaza = { aMundo: (px, py) => ({ x: (px - 8968.2) * METRO, z: (py - 6839.0) * METRO }) }
    sinAgujas(extruirTechos({
      vertices: Float32Array.from([8266.169, 6786.564, 8276.651, 6740.78, 8258.919, 6713.874, 8243.467, 6781.367]),
      techos: Uint32Array.from([0, 4, 1, 7030]), vida: Uint32Array.from([1]),
      marcos: Float32Array.from([0, 8266.17, 6786.56, -0.97478, -0.22317, 23.29, 69.24, 0, 16.4, 0, 5]),
      alas: Float32Array.from([2, 0, 0, 23.29, 16.4, 4, 0, 16.4, 8.62, 23.86, 0, 8.62, 16.4, 23.29, 23.86,
        3, 0, 23.86, 23.29, 34.16, 1, 0, 34.16, 23.29, 69.24]),
    }, plaza))
  })
})

// la casa 32751 de la ciudad de 1772, como viene en el pak (datos con T33j.6g): su triangulación armaba agujas
const CASA_32751 = {
  vertices: Float32Array.from([7849, 5712.293, 7848.825, 5712.468, 7848, 5718.442, 7848, 5720.293, 7847.703, 5720.59, 7847, 5725.681,
    7847, 5728.293, 7846.581, 5728.712, 7844.215, 5745.844, 7862.182, 5749.134, 7869.934, 5712.314, 7868.556, 5712, 7866.707, 5712,
    7862.706, 5710.666, 7855.398, 5709, 7853.707, 5709, 7853.208, 5708.501, 7851.011, 5708, 7848.455, 5708, 7848.324, 5708.652,
    7849.324, 5708.854, 7849, 5711.202]),
  techos: Uint32Array.from([0, 22, 1, 32478]), vida: Uint32Array.from([17]), historia: Uint8Array.from([16, 16, 16, 16, 17, 17]),
  marcos: Float32Array.from([0, 7850.0498046875, 5708.33984375, 0.9757099747657776, 0.21908999979496002, 20, 39, 6, 14.51, 0, 0]),
  alas: Float32Array.from([]), vuelos: Uint8Array.from([66]),
}

describe('extruirTechos: ninguna aguja, tampoco las que arma la triangulación (T33j.6d)', () => {
  test('la casa 32751 de la ciudad de 1772, donde está, no deja triángulos de menos de 1 mm de alto', () => {
    const plaza = { aMundo: (px, py) => ({ x: (px - 8968.2) * METRO, z: (py - 6839.0) * METRO }) }
    sinAgujas(extruirTechos(CASA_32751, plaza))
  })
})

function sinAgujas(g) {
  {
    const p = (i) => [g.posiciones[i * 3], g.posiciones[i * 3 + 1], g.posiciones[i * 3 + 2]]
    for (let t = 0; t < g.indices.length; t += 3) {
      if (g.cubiertas[g.indices[t] * 4 + 3] === CUBIERTA.PARED) continue
      const [a, b, c] = [p(g.indices[t]), p(g.indices[t + 1]), p(g.indices[t + 2])]
      const [u, v] = [[b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]]
      const area = Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2
      const lado = Math.max(Math.hypot(...u), Math.hypot(...v), Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]))
      expect(2 * area / lado).toBeGreaterThanOrEqual(1e-3)
    }
  }
}

describe('extruirTechos: el alero no pasa su tope (T33j.6f)', () => {
  test('una casa con 10 cm de tope no vuela más que eso sobre la calle; sin tope, vuela como siempre', () => {
    const datos = { ...ciudadDe([{ puntos: rect(0, 0, 10, 12), semilla: 5 }]), vuelos: Uint8Array.from([10]) }
    const sinTope = { ...datos, vuelos: Uint8Array.from([255]) }
    const lejos = (g) => Math.max(...vertices(g).filter((v) => v.cubierta !== CUBIERTA.PARED).map((v) => -v.z))
    expect(lejos(extruirTechos(sinTope, coords))).toBeGreaterThan(0.45)
    expect(lejos(extruirTechos(datos, coords))).toBeLessThanOrEqual(0.1 + 1e-6)
  })
})

describe('alinearHuella: solo hacia adentro (T33j.6f)', () => {
  test('con soloAdentro, el vértice detrás de la línea de fachada se queda y el que la pasa vuelve a ella', () => {
    const anillo = [[0, 0.8], [10, -0.3], [10, 12], [0, 12]]
    expect(alinearHuella(anillo, 10, 12, {})).toEqual([[0, 0], [10, 0], [10, 12], [0, 12]])
    expect(alinearHuella(anillo, 10, 12, {}, { soloAdentro: true })).toEqual([[0, 0.8], [10, 0], [10, 12], [0, 12]])
  })

  test('con soloAdentro, tampoco se corren hacia afuera los costados que dan a la calle', () => {
    const anillo = [[0.5, 0], [10, 0], [10.4, 12], [0.5, 12]]
    expect(alinearHuella(anillo, 10, 12, { izq: true, der: true }, { soloAdentro: true }))
      .toEqual([[0.5, 0], [10, 0], [10, 12], [0.5, 12]])
  })
})

describe('extruirTechos: el techo no se adelanta a la línea de la cuadra (T33j.6h)', () => {
  test('una casa con marco cuyo frente queda 1 m detrás de la línea no lleva el techo hasta ella', () => {
    // el marco pone la línea de fachada en z = 0; la casa empieza en z = 1 (sin tope de vuelo)
    const datos = {
      ...ciudadDe([{ puntos: rect(0, 1, 10, 14), semilla: 5, estilo: REPUBLICANO }]),
      marcos: Float32Array.from([0, 0, 0, 1, 0, 20, 28, 0, 14, 0, 0]), alas: Float32Array.from([]),
    }
    const tejas = vertices(extruirTechos(datos, coords)).filter((v) => v.cubierta === CUBIERTA.TEJA)
    expect(tejas.length).toBeGreaterThan(0)
    expect(Math.min(...tejas.map((v) => v.z))).toBeGreaterThanOrEqual(1 - 1e-6)
  })
})

describe('extruirTechos: el alero solo sale hacia un lado libre (T33j.6h)', () => {
  test('el frente de una casa con marco que da a otra casa de su época no lleva alero sobre ella', () => {
    // la casa 0 tiene el frente (marco) en z = 0 y, delante, la casa 1 (z < 0), que vive en las mismas épocas
    const conVecina = {
      ...ciudadDe([{ puntos: rect(0, 0, 10, 14), semilla: 5, nace: 1, muere: 2 }, { puntos: rect(0, -12, 10, 0), semilla: 6, nace: 1, muere: 2 }]),
      marcos: Float32Array.from([0, 0, 0, 1, 0, 20, 28, 0, 14, 0, 0]), alas: Float32Array.from([]),
    }
    const sobre = (g) => vertices(g).filter((v) => v.semilla === 5 && v.cubierta !== CUBIERTA.PARED && v.z < -0.01)
    expect(sobre(extruirTechos(conVecina, coords))).toHaveLength(0)
    // si la de delante es de otra época (nace cuando la primera ya murió), el frente da a la calle y vuela
    const otraEpoca = { ...conVecina, vida: Uint32Array.from([1 + 8 * 2, 3]) }
    expect(sobre(extruirTechos(otraEpoca, coords)).length).toBeGreaterThan(0)
  })
})

describe('extruirTechos: el alero tramo por tramo (T33j.6h)', () => {
  test('una vecina de su época que tapa solo una parte del frente no recibe el alero (el tramo entero queda sin él)', () => {
    // la casa 0 (frente en z = 0, de x = 0 a 20) y delante, solo de x = 12 a 20, la casa 1
    const datos = {
      ...ciudadDe([{ puntos: rect(0, 0, 20, 14), semilla: 5, nace: 1, muere: 2 }, { puntos: rect(12, -10, 20, 0), semilla: 6, nace: 1, muere: 2 }]),
      marcos: Float32Array.from([0, 0, 0, 1, 0, 40, 28, 0, 14, 0, 0]), alas: Float32Array.from([]),
    }
    const vuela = vertices(extruirTechos(datos, coords)).filter((v) => v.semilla === 5 && v.cubierta !== CUBIERTA.PARED && v.z < -0.01)
    expect(vuela.some((v) => v.x > 12.01)).toBe(false)
  })
})

describe('extruirTechos: la vecina cuenta en las épocas en que vive (revisión de #147)', () => {
  test('una casa que nace en 1772 y nunca muere vuela en 1772 aunque delante nazca una casa en 1843', () => {
    const datos = {
      ...ciudadDe([{ puntos: rect(0, 0, 10, 14), semilla: 5, nace: 1, muere: 0 }, { puntos: rect(0, -12, 10, 0), semilla: 6, nace: 2, muere: 0 }]),
      marcos: Float32Array.from([0, 0, 0, 1, 0, 20, 28, 0, 14, 0, 0]), alas: Float32Array.from([]),
    }
    const g = extruirTechos(datos, coords)
    const delFrente = vertices(g).map((v, k) => ({ ...v, nace: g.vidas[k * 2], muere: g.vidas[k * 2 + 1] }))
      .filter((v) => v.semilla === 5 && v.cubierta !== CUBIERTA.PARED && v.z < -0.01)
    // en 1772 (época 1) vuela; desde 1843 (época 2), con la vecina delante, no
    expect(delFrente.some((v) => v.nace <= 1 && (v.muere === 0 || v.muere > 1))).toBe(true)
    expect(delFrente.some((v) => v.nace <= 2 && (v.muere === 0 || v.muere > 2))).toBe(false)
  })
})

describe('extruirTechos: una vecina que muere antes también cuenta mientras convive (revisión de #147)', () => {
  test('la casa de 1772 que muere en 1843 tapa el alero de la de enfrente en 1772, y deja de taparlo después', () => {
    const datos = {
      ...ciudadDe([{ puntos: rect(0, 0, 10, 14), semilla: 5, nace: 1, muere: 0 }, { puntos: rect(0, -12, 10, 0), semilla: 6, nace: 1, muere: 2 }]),
      marcos: Float32Array.from([0, 0, 0, 1, 0, 20, 28, 0, 14, 0, 0]), alas: Float32Array.from([]),
    }
    const g = extruirTechos(datos, coords)
    const delFrente = vertices(g).map((v, k) => ({ ...v, nace: g.vidas[k * 2], muere: g.vidas[k * 2 + 1] }))
      .filter((v) => v.semilla === 5 && v.cubierta !== CUBIERTA.PARED && v.z < -0.01)
    expect(delFrente.some((v) => v.nace <= 1 && (v.muere === 0 || v.muere > 1))).toBe(false)
    expect(delFrente.some((v) => v.nace <= 2 && (v.muere === 0 || v.muere > 2))).toBe(true)
  })
})

describe('prepararCasas y extruirCasas: la ciudad por partes', () => {
  const datos = ciudadDe([
    { puntos: rect(0, 0, 10, 24), semilla: 5, nace: 1 },
    { puntos: rect(10, 0, 20, 24), semilla: 11, nace: 1, muere: 3 },
    { puntos: rect(20, 0, 30, 24), semilla: 6, nace: 4 },
  ])
  const entera = extruirTechos(datos, coords)
  const preparado = prepararCasas(datos, coords)

  test('todas las casas, en su orden, dan lo mismo que extruirTechos', () => {
    expect(extruirCasas(preparado)).toEqual(entera)
    expect(extruirCasas(preparado, { numeros: [0, 1, 2] })).toEqual(entera)
  })
  test('con `numeros`, solo esas casas: cada una sale igual que en la ciudad entera (mira a las mismas vecinas)', () => {
    const una = extruirCasas(preparado, { numeros: [1] })
    const semillas = new Set(vertices(una).map((v) => v.semilla))
    expect([...semillas]).toEqual([11])
    const enLaEntera = vertices(entera).filter((v) => v.semilla === 11)
    expect(vertices(una)).toEqual(enLaEntera)
  })
  test('las partes suman la ciudad entera', () => {
    const partes = [[0], [1], [2]].map((numeros) => extruirCasas(preparado, { numeros }))
    expect(partes.reduce((s, p) => s + p.posiciones.length, 0)).toBe(entera.posiciones.length)
    expect(partes.reduce((s, p) => s + p.indices.length, 0)).toBe(entera.indices.length)
  })
  test('con `quiere`, solo los tramos de épocas pedidos; los dos pases juntos dan todos los vértices', () => {
    const enLa1 = (t) => t.nace <= 1 && (t.muere === 0 || t.muere > 1)
    const primero = extruirCasas(preparado, { quiere: enLa1 })
    const resto = extruirCasas(preparado, { quiere: (t) => !enLa1(t) })
    expect(primero.posiciones.length).toBeGreaterThan(0)
    expect(resto.posiciones.length).toBeGreaterThan(0)
    expect(primero.posiciones.length + resto.posiciones.length).toBe(entera.posiciones.length)
    for (let v = 0; v < primero.vidas.length; v += 2) expect(enLa1({ nace: primero.vidas[v], muere: primero.vidas[v + 1] })).toBe(true)
    for (let v = 0; v < resto.vidas.length; v += 2) expect(enLa1({ nace: resto.vidas[v], muere: resto.vidas[v + 1] })).toBe(false)
  })
  test('sin casas pedidas, arrays vacíos', () => {
    const nada = extruirCasas(preparado, { numeros: [] })
    expect(nada.posiciones).toHaveLength(0)
    expect(nada.indices).toHaveLength(0)
  })
})

describe('esferaDe', () => {
  test('la misma esfera que calcula three.js', () => {
    const { posiciones } = extruirTechos(cuadra(COLONIAL), coords)
    const g = new BufferGeometry().setAttribute('position', new BufferAttribute(posiciones, 3))
    g.computeBoundingSphere()
    const esfera = esferaDe(posiciones)
    expect(esfera.centro).toEqual(g.boundingSphere.center.toArray())
    expect(esfera.radio).toBeCloseTo(g.boundingSphere.radius, 10)
  })
  test('sin puntos, una esfera de radio 0 en el origen', () => {
    expect(esferaDe(new Float32Array(0))).toEqual({ centro: [0, 0, 0], radio: 0 })
  })
})

describe('paqueteDeGeometria: lo que viaja del worker a la página', () => {
  const crudo = extruirTechos(cuadra(COLONIAL), coords)
  const paquete = paqueteDeGeometria(crudo)

  test('cada atributo en su tipo final, con todos sus vértices', () => {
    const n = crudo.posiciones.length / 3
    for (const [nombre, { n: porVertice, Tipo }] of Object.entries(ATRIBUTOS)) {
      expect(paquete.atributos[nombre], nombre).toBeInstanceOf(Tipo)
      expect(paquete.atributos[nombre].length, nombre).toBe(n * porVertice)
    }
    expect(paquete.indices).toBe(crudo.indices)
    expect(paquete.esfera).toEqual(esferaDe(crudo.posiciones))
  })
  test('las normales en bytes (por 127) y la vida tal cual', () => {
    for (let k = 0; k < crudo.normales.length; k++) expect(paquete.atributos.normal[k]).toBe(Math.round(crudo.normales[k] * 127) || 0)
    expect([...paquete.atributos.aVida]).toEqual([...crudo.vidas])
  })
  test('los transferibles son los búferes de los atributos y de los índices, sin repetir', () => {
    const lista = transferiblesDe(paquete)
    expect(lista).toHaveLength(Object.keys(ATRIBUTOS).length + 1)
    expect(new Set(lista).size).toBe(lista.length)
    for (const b of lista) expect(b).toBeInstanceOf(ArrayBuffer)
  })
  test('geometriaDePaquete arma la misma geometría que geometriaCiudad, con la esfera ya puesta', () => {
    const g = geometriaDePaquete(paquete)
    const otra = geometriaCiudad(cuadra(COLONIAL), coords)
    for (const nombre of Object.keys(ATRIBUTOS)) expect([...g.attributes[nombre].array], nombre).toEqual([...otra.attributes[nombre].array])
    expect([...g.index.array]).toEqual([...otra.index.array])
    expect(g.attributes.normal.normalized).toBe(true)
    expect(g.boundingSphere.radius).toBeCloseTo(paquete.esfera.radio, 10)
    expect(g.boundingSphere.center.toArray()).toEqual(paquete.esfera.centro)
  })
})
