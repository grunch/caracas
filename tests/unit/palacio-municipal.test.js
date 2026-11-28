import { describe, test, expect } from 'vitest'
import { crearLienzo, MAT } from '../../src/hitos/lienzo.js'
import { palacioMunicipal as dibujarPalacio } from '../../src/hitos/palacio-municipal.js'
import { parteDe } from '../../src/hitos/partes.js'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { palacioMunicipal, MEDIDAS_PALACIO_MUNICIPAL as M, CENTRO_PALACIO_MUNICIPAL as CENTRO } from '../../src/hitos/datos/palacio-municipal.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const ID = 'palacio-municipal'
const hito = (id) => HITOS.find((h) => h.id === id)
const marca = (id) => MARCAS.find((m) => m.id === id)

// Las esquinas del recuadro rayado «Palacio de Justicia» y de su patio, leídas del plano DCN de 1936
// (docs/palacio-municipal-georreferencia.json), en píxeles del mosaico (0,5 m por píxel).
const ESQUINAS_1936 = [[8853, 6929], [8940, 6951], [8916, 7097], [8825, 7079]]
const PATIO_1936 = [[8873, 6962.5], [8915.6, 6972.5], [8909, 7009], [8867.5, 7001]]
const TOLERANCIA_M = 3 // la planta va como rectángulo y el recuadro del plano es un cuadrilátero algo torcido

function dibujar(fn) {
  const lienzo = crearLienzo()
  fn(lienzo.hito({ origen: { x: 0, z: 0 } }))
  const d = lienzo.datos()
  const vertices = []
  for (let i = 0; i < d.posiciones.length; i += 3) vertices.push({ x: d.posiciones[i], y: d.posiciones[i + 1], z: d.posiciones[i + 2] })
  const eje = (k) => vertices.map((v) => v[k])
  const caja = { min: ['x', 'y', 'z'].map((k) => Math.min(...eje(k))), max: ['x', 'y', 'z'].map((k) => Math.max(...eje(k))) }
  const materiales = new Set([...d.hitos].filter((_, i) => i % 4 === 2))
  return { ...d, vertices, caja, materiales, triangulos: d.indices.length / 3, sano: d.posiciones.every(Number.isFinite) && d.normales.every(Number.isFinite) }
}

/** El vértice más alto de lo que está en pie en `epoca` (metros del mundo), o null si no hay nada. */
function cimaEn(datos, id, epoca) {
  const { desde, hasta } = datos.rangos.find((r) => r.id === id)
  let cima = null
  for (let i = desde; i < hasta; i++) {
    const [nace, muere] = [datos.vidas[i * 2], datos.vidas[i * 2 + 1]]
    if (nace > epoca || (muere && muere <= epoca)) continue
    const y = datos.posiciones[i * 3 + 1]
    if (cima === null || y > cima) cima = y
  }
  return cima
}

/** La altura de la superficie más alta sobre (x, z): rayo vertical contra los triángulos; -Infinity si no hay nada. */
function alturaSobre(d, x, z) {
  let cima = -Infinity
  for (let t = 0; t < d.indices.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => d.vertices[d.indices[t + k]])
    const det = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z)
    if (Math.abs(det) < 1e-9) continue // triángulo vertical
    const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / det
    const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / det
    if (u < 0 || v < 0 || u + v > 1) continue
    cima = Math.max(cima, u * a.y + v * b.y + (1 - u - v) * c.y)
  }
  return cima
}

const distanciaM = ([x1, y1], [x2, y2]) => Math.hypot(x1 - x2, y1 - y2) * PLANO.metro

describe('la parte palacioMunicipal: crujías de dos pisos alrededor de un patio, con el frente a la plaza', () => {
  const medidas = { ancho: 45.5, fondo: 75, patio: { ancho: 21.9, fondo: 19.4, a: 0.8, b: -14.4 }, pisos: 2, altoPiso: 5 }
  const alto = medidas.pisos * medidas.altoPiso

  test('ocupa el rectángulo pedido (más cornisas y columnas) y es geometría sana', () => {
    // Arrange / Act
    const d = dibujar((p) => dibujarPalacio(p, medidas))

    // Assert
    expect(d.sano).toBe(true)
    expect(d.caja.min[0]).toBeGreaterThan(-medidas.ancho / 2 - 1.5)
    expect(d.caja.max[0]).toBeLessThan(medidas.ancho / 2 + 1.5)
    expect(d.caja.min[0]).toBeLessThan(-medidas.ancho / 2 + 0.01)
    expect(d.caja.max[2]).toBeGreaterThan(medidas.fondo / 2 - 0.01)
    expect(d.caja.max[2]).toBeLessThan(medidas.fondo / 2 + 1.5)
    expect(d.caja.min[2]).toBeGreaterThan(-medidas.fondo / 2 - 2.5) // el cuerpo central y sus columnas salen hacia la plaza
  })

  test('el patio queda abierto y las cuatro crujías, techadas a la altura de la azotea', () => {
    // Arrange
    const d = dibujar((p) => dibujarPalacio(p, medidas))
    const { a, b, ancho, fondo } = medidas.patio

    // Act: un rayo en el centro del patio (la fuente), otros cerca de sus esquinas y uno sobre cada crujía
    const enElPatio = [[a + 5, b + 4], [a - 5, b - 4], [a + ancho / 2 - 4, b - fondo / 2 + 4]].map(([x, z]) => alturaSobre(d, x, z))
    const crujias = [[0, -medidas.fondo / 2 + 5], [0, medidas.fondo / 2 - 10], [-medidas.ancho / 2 + 4, b], [medidas.ancho / 2 - 4, b]].map(([x, z]) => alturaSobre(d, x, z))

    // Assert
    for (const y of enElPatio) expect(y).toBeLessThan(0.5) // solo el piso del patio
    expect(alturaSobre(d, a, b)).toBeLessThan(medidas.altoPiso) // la fuente
    expect(alturaSobre(d, a, b)).toBeGreaterThan(1)
    for (const y of crujias) { expect(y).toBeGreaterThanOrEqual(alto); expect(y).toBeLessThan(alto + 0.5) }
  })

  test('los corredores del patio tienen dos niveles: una losa a la altura del primer piso y otra arriba', () => {
    const d = dibujar((p) => dibujarPalacio(p, medidas))
    const { a, b, fondo } = medidas.patio
    const borde = alturaSobre(d, a, b - fondo / 2 + 1) // a 1 m del muro norte del patio
    expect(borde).toBeCloseTo(alto, 1)
    const losas = new Set(d.vertices.filter((v) => Math.abs(v.x - a) < medidas.patio.ancho / 2 + 0.1 && Math.abs(v.z - (b - fondo / 2 + 1.3)) < 1.4).map((v) => Math.round(v.y * 4) / 4))
    expect(losas.has(medidas.altoPiso)).toBe(true)
    expect(losas.has(alto)).toBe(true)
  })

  test('tiene dos pisos: la azotea va a pisos × altoPiso y un piso más la sube', () => {
    const dos = dibujar((p) => dibujarPalacio(p, medidas))
    const tres = dibujar((p) => dibujarPalacio(p, { ...medidas, pisos: 3 }))
    // el muro oeste, lejos de los remates del frente: su punto más alto es el pretil
    const cimaOeste = (d) => Math.max(...d.vertices.filter((v) => v.x < -medidas.ancho / 2 + 1 && v.z > 0).map((v) => v.y))
    expect(cimaOeste(dos)).toBeGreaterThanOrEqual(alto)
    expect(cimaOeste(dos)).toBeLessThan(alto + 1.5)
    expect(cimaOeste(tres) - cimaOeste(dos)).toBeCloseTo(medidas.altoPiso, 5)
  })

  test('el frente a la plaza lleva un frontón triangular al centro y remates curvos más bajos en los extremos', () => {
    // Arrange
    const d = dibujar((p) => dibujarPalacio(p, medidas))
    const zFrente = -medidas.fondo / 2 - 0.9 // delante del muro, sobre los cuerpos salientes
    const perfil = (x0, dx) => alturaSobre(d, x0 + dx, zFrente)
    const centroPabellon = medidas.ancho / 2 - 4

    // Act
    const centro = [0, 1.5, 3].map((dx) => perfil(0, dx))
    const pabellones = [-1, 1].map((s) => [0, 1.5, 3].map((dx) => perfil(s * centroPabellon, dx)))

    // Assert: el del centro baja parejo (triangular); los de los lados bajan poco al principio y más después (curvos)
    expect(centro[0]).toBeGreaterThan(alto + 2.5)
    expect((centro[0] - centro[1]) - (centro[1] - centro[2])).toBeCloseTo(0, 2)
    expect(centro[0] - centro[1]).toBeGreaterThan(0.5)
    for (const [y0, y1, y2] of pabellones) {
      expect(y0).toBeGreaterThan(alto + 1.5)
      expect(y0).toBeLessThan(centro[0])
      expect(y1 - y2).toBeGreaterThan((y0 - y1) * 2)
    }
    // entre los tres cuerpos no hay remate: delante del muro no hay nada y sobre él, solo el pretil
    expect(perfil(-9, 0)).toBeLessThan(alto)
    expect(alturaSobre(d, -9, -medidas.fondo / 2 + 0.1)).toBeLessThan(alto + 1)
  })

  test('los otros tres lados no llevan frontones: el frente es solo el de la plaza', () => {
    const d = dibujar((p) => dibujarPalacio(p, medidas))
    const atras = d.vertices.filter((v) => v.z > -medidas.fondo / 2 + 3)
    expect(Math.max(...atras.map((v) => v.y))).toBeLessThan(alto + 1.5)
  })

  test('cubierta plana, sin teja (el alzado descrito es el de la reforma de 1904–1906)', () => {
    const d = dibujar((p) => dibujarPalacio(p, medidas))
    expect(d.materiales.has(MAT.TEJA)).toBe(false)
  })

  test('rechaza un patio que no entra en la planta', () => {
    expect(() => dibujar((p) => dibujarPalacio(p, { ...medidas, patio: { ancho: 50, fondo: 19, a: 0, b: 0 } }))).toThrow(/patio/)
    expect(() => dibujar((p) => dibujarPalacio(p, { ...medidas, patio: { ancho: 20, fondo: 19, a: 0, b: -30 } }))).toThrow(/patio/)
  })

  test('está registrada como parte', () => {
    expect(dibujar((p) => parteDe('palacioMunicipal')(p, medidas)).sano).toBe(true)
  })
})

describe('Palacio Municipal, antiguo Seminario de Santa Rosa (#252)', () => {
  const datos = construirHitos(HITOS, coords)

  test('está en HITOS, después de los que ya estaban (no mueve sus semillas), y pasa la validación', () => {
    // después de los que ya estaban en main: cada hito lleva de semilla su lugar en la lista
    expect(HITOS.findIndex((h) => h.id === ID)).toBeGreaterThan(HITOS.findIndex((h) => h.id === 'san-jose'))
    expect(hito(ID)).toBe(palacioMunicipal)
    expect(validarHitos([palacioMunicipal], PLANO)).toEqual([])
  })

  test('el edificio aparece en 1911, tras la reforma de 1904–1906, y no se dibuja antes', () => {
    expect([palacioMunicipal.nace, palacioMunicipal.muere]).toEqual([4, 0])
    for (const epoca of [1, 2, 3]) expect(cimaEn(datos, ID, epoca)).toBeNull()
    for (const epoca of [4, 5, 6]) expect(cimaEn(datos, ID, epoca)).toBeGreaterThan(10)
  })

  test('la planta es el recuadro rayado del plano de 1936: cada esquina a menos de 3 m de la leída', () => {
    const [planta] = palacioMunicipal.suprime
    expect(palacioMunicipal.suprime).toHaveLength(1)
    for (const esquina of ESQUINAS_1936) {
      const cerca = Math.min(...planta.map((p) => distanciaM(p, esquina)))
      expect(cerca).toBeLessThan(TOLERANCIA_M)
    }
  })

  test('el patio del modelo es el que dibuja el plano: su centro y sus lados, a menos de 1,5 m', () => {
    const centroLeido = [0, 1].map((k) => PATIO_1936.reduce((s, p) => s + p[k], 0) / 4)
    const n = Math.hypot(...palacioMunicipal.eje)
    const [ux, uy] = palacioMunicipal.eje.map((c) => c / n)
    const [dx, dy] = [centroLeido[0] - CENTRO[0], centroLeido[1] - CENTRO[1]]
    const [a, b] = [(dx * ux + dy * uy) * PLANO.metro, (-dx * uy + dy * ux) * PLANO.metro]
    expect(Math.abs(a - M.patio.a)).toBeLessThan(1.5)
    expect(Math.abs(b - M.patio.b)).toBeLessThan(1.5)
    expect(Math.abs(distanciaM(PATIO_1936[0], PATIO_1936[1]) - M.patio.ancho)).toBeLessThan(1.5)
    expect(Math.abs(distanciaM(PATIO_1936[0], PATIO_1936[3]) - M.patio.fondo)).toBeLessThan(1.5)
    expect(palacioMunicipal.partes[0]).toMatchObject({ tipo: 'palacioMunicipal', ancho: M.ancho, fondo: M.fondo, patio: M.patio, pisos: 2, b: M.fondo / 2 })
  })

  test('el hito se ancla al pie del frente (el suelo más alto) y el centro de la planta queda a medio fondo hacia el sur', () => {
    const n = Math.hypot(...palacioMunicipal.eje)
    const [ux, uy] = palacioMunicipal.eje.map((c) => c / n)
    const [dx, dy] = [CENTRO[0] - palacioMunicipal.x, CENTRO[1] - palacioMunicipal.y]
    expect((dx * ux + dy * uy) * PLANO.metro).toBeCloseTo(0, 1)
    expect((-dx * uy + dy * ux) * PLANO.metro).toBeCloseTo(M.fondo / 2, 1)
    // con el desplazamiento, la geometría es la misma corrida medio fondo
    const centrada = dibujar((p) => dibujarPalacio(p, { ...M, pisos: 2, altoPiso: 5 }))
    const corrida = dibujar((p) => dibujarPalacio(p, { ...M, pisos: 2, altoPiso: 5, b: M.fondo / 2 }))
    expect(corrida.caja.min[2]).toBeCloseTo(centrada.caja.min[2] + M.fondo / 2, 4)
    expect(corrida.caja.max[2]).toBeCloseTo(centrada.caja.max[2] + M.fondo / 2, 4)
    expect(corrida.triangulos).toBe(centrada.triangulos)
  })

  test('el frente con frontón mira al norte, a la plaza', () => {
    const { desde, hasta } = datos.rangos.find((r) => r.id === ID)
    let cima = null
    for (let i = desde; i < hasta; i++) {
      const v = { x: datos.posiciones[i * 3], y: datos.posiciones[i * 3 + 1], z: datos.posiciones[i * 3 + 2] }
      if (!cima || v.y > cima.y) cima = v
    }
    const centro = coords.aMundo(...CENTRO)
    expect(cima.z).toBeLessThan(centro.z - M.fondo / 2 + 4) // z crece hacia el sur: el frontón está en el borde norte
    expect(cima.z).toBeLessThan(0 + 60) // y del lado de la plaza (el origen del mundo es su centro)
  })

  test('la reserva cubre el solar y deja afuera la plaza, la calle Sur 2 y a los vecinos de la cuadra', () => {
    const zonas = zonasDeSupresion([palacioMunicipal])
    const dentro = (p) => zonas.some((z) => puntoEnPoligono(p, z.poligono))
    for (const p of [[8885, 6950], [8890, 6985], [8870, 7060], [8905, 7085]]) expect(dentro(p)).toBe(true)
    // la calle frente a la plaza, la calle Sur 2, el vecino del este (Palacio Arzobispal en 1843, 1889 y 1911) y el fondo de la cuadra
    for (const p of [[8890, 6920], [8825, 6990], [8965, 6990], [8950, 7060], [8865, 7110]]) expect(dentro(p)).toBe(false)
    expect(zonas.every((z) => z.desde === 4 && z.hasta === 0)).toBe(true)
  })

  test('es un solar, no la cuadra: ocupa menos de la mitad de la manzana (el umbral de «grande» de R13)', () => {
    const [solar] = palacioMunicipal.suprime
    const area = (poligono) => Math.abs(poligono.reduce((s, [x, y], i) => { const [x2, y2] = poligono[(i + 1) % poligono.length]; return s + x * y2 - x2 * y }, 0)) / 2 * PLANO.metro ** 2
    // la cuadra entre Monjas, Gradillas, Sociedad y San Francisco en el plano de 1936 (esquinas a ojo, ±2 px)
    const cuadra = [[8853, 6929], [9037, 6970], [8985, 7215], [8805, 7180]]
    const fraccion = area(solar) / area(cuadra)
    expect(fraccion).toBeGreaterThan(0.2)
    expect(fraccion).toBeLessThan(0.5)
  })

  test('no pisa los hitos vecinos: la Universidad de San Francisco, el Palacio Arzobispal ni la Plaza Bolívar', () => {
    const mio = palacioMunicipal.suprime[0]
    for (const id of ['universidad', 'palacio-arzobispal', 'plaza-bolivar']) {
      const otro = hito(id)
      for (const poligono of [...(otro.planta ?? []), ...(otro.suprime ?? [])]) {
        expect(poligono.some((p) => puntoEnPoligono(p, mio)), id).toBe(false)
        expect(mio.some((p) => puntoEnPoligono(p, poligono)), id).toBe(false)
      }
    }
  })

  test('la colisión a pie son los cuatro cuerpos, desde 1911: el patio del plano queda abierto y el cuerpo de atrás, cerrado', () => {
    // Arrange
    const etapas = hitosConPlanta().filter((p) => p.id === ID)
    const choca = (p) => etapas.some((e) => e.planta.some((poligono) => puntoEnPoligono(p, poligono)))
    const centroPatio = [0, 1].map((k) => PATIO_1936.reduce((s, p) => s + p[k], 0) / 4)

    // Assert
    expect(etapas).toHaveLength(1)
    expect(etapas[0]).toMatchObject({ nace: 4, muere: 0 })
    expect(etapas[0].patio).toBeUndefined() // el patio genérico de a-pie.js abriría también el cuerpo de atrás
    expect(etapas[0].planta).toHaveLength(4)
    expect(choca(centroPatio)).toBe(false)
    for (const p of PATIO_1936) expect(choca([p[0] + (centroPatio[0] - p[0]) * 0.2, p[1] + (centroPatio[1] - p[1]) * 0.2])).toBe(false)
    // la crujía de la plaza, la del oeste, la del este y el cuerpo de atrás
    for (const p of [[8893, 6948], [8858, 6985], [8925, 6992], [8870, 7050], [8900, 7085]]) expect(choca(p), `${p}`).toBe(true)
    // los cuatro cuerpos llenan el solar menos el patio
    const area = (poligono) => Math.abs(poligono.reduce((s, [x, y], i) => { const [x2, y2] = poligono[(i + 1) % poligono.length]; return s + x * y2 - x2 * y }, 0)) / 2 * PLANO.metro ** 2
    const cuerpos = etapas[0].planta.reduce((s, poligono) => s + area(poligono), 0)
    expect(cuerpos).toBeCloseTo(M.ancho * M.fondo - M.patio.ancho * M.patio.fondo, 3)
  })

  test('trae sus fuentes con enlace y dice lo que no tiene fuente', () => {
    expect(palacioMunicipal.fuente).toMatch(/https:\/\/iamvenezuela\.org/)
    expect(palacioMunicipal.fuente).toMatch(/1936/)
    const verificar = palacioMunicipal.verificar.join(' ')
    expect(verificar).toMatch(/altura/i)
    expect(verificar).toMatch(/1889/)
    expect(verificar).toMatch(/capilla/i)
  })
})

describe('una sola marca para el conjunto, con el nombre que cada plano le da', () => {
  test('las tres marcas sueltas (seminario, concejo, justicia) dejan su lugar a la del conjunto', () => {
    for (const id of ['seminario', 'concejo', 'justicia']) {
      expect(marca(id)).toBeUndefined()
      expect(FICHAS[id]).toBeUndefined()
    }
    expect(MARCAS.filter((m) => m.id === ID)).toHaveLength(1)
  })

  test('sale del hito (sobre el solar, no sobre la calle) y existe desde 1772 aunque el edificio se dibuje desde 1911', () => {
    const m = marca(ID)
    expect(m.hito).toBe(ID)
    expect([m.x, m.y]).toEqual([...CENTRO]) // el punto, al centro del solar; el hito se ancla al pie del frente
    expect(m.nace).toBe(1)
    expect(m.muere ?? 0).toBe(0)
    expect(puntoEnPoligono([m.x, m.y], palacioMunicipal.suprime[0])).toBe(true)
  })

  test('cada nombre es el de la leyenda o el rótulo del plano de esa época', () => {
    const m = marca(ID)
    expect(m.nombres.map(([desde, nombre]) => [desde, nombre])).toEqual([
      [1, 'Seminario de Santa Rosa y Universidad'],
      [2, 'Universidad y su capilla'],
      [3, 'Concejo Municipal y Gobernación'],
      [4, 'Concejo Municipal y Palacio de Justicia'],
      [5, 'Palacio de Justicia'],
    ])
    expect(m.fuente).toMatch(/k «Universidad»/)
    expect(m.fuente).toMatch(/L «Cap\. de la Universidad»/)
    expect(m.fuente).toMatch(/7 «Consejo municipal».*8 «Gobernación»/)
    expect(m.fuente).toMatch(/Razetti de 1911.*11 «Palacio de Justicia».*12 «Concejo Municipal»/)
    expect(m.fuente).toMatch(/1936.*«Palacio de Justicia»/)
    expect(m.dudas).toMatch(/1772/) // el nombre de 1772 no sale de un plano
  })

  test('la ficha cuenta cada etapa y dice a la vista, en las épocas sin edificio, que no se dibuja', () => {
    const f = FICHAS[ID]
    expect(f.textos.map(([e]) => e)).toEqual([1, 2, 3, 4, 5])
    for (const [epoca, texto] of f.textos) {
      if (epoca < palacioMunicipal.nace) expect(texto, `época ${epoca}`).toMatch(/no se dibuja/)
      else expect(texto, `época ${epoca}`).not.toMatch(/no se dibuja/)
    }
    expect(f.textos[1][1]).toMatch(/1812/) // en 1843 se dice el daño del terremoto, no un edificio intacto
    expect(f.textos[3][1]).toMatch(/Chataing/)
    expect(f.textos[3][1]).toMatch(/según el catálogo del IPC, citado por IAM Venezuela/)
    expect(f.dudas).toMatch(/altura/i)
    expect(f.dudas).toMatch(/1872.*1873|1873.*1872/) // la contradicción de fechas del cierre del seminario
    expect(f.hoy).toMatch(/Palacio Municipal/)
  })
})
