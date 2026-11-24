import { describe, test, expect } from 'vitest'
import { InstancedMesh, PerspectiveCamera } from 'three'
import { crearArboles, instanciasArboles, gruposDeArboles, detalleDeGrupo, DIST_DETALLE_M } from '../../src/arboles.js'
import { crearCoords } from '../../src/coords.js'
import { crearMaterialCiudad } from '../../src/material.js'

const coords = crearCoords({ ancho: 1000, alto: 1000, metro: 0.5, plaza: [500, 500] })
const datos = {
  n: 2,
  x: new Uint16Array([500, 600]),
  y: new Uint16Array([500, 400]),
  radio: new Float32Array([4, 2.5]),
  nace: new Uint16Array([0, 3]),
  muere: new Uint16Array([2, 0]),
  silvestre: new Uint8Array([1, 0]),
}

describe('instanciasArboles', () => {
  test('pasa los píxeles al mundo y deja radio, nace y una semilla estable por árbol', () => {
    // Act
    const inst = instanciasArboles(datos, coords)
    // Assert
    expect([...inst.posiciones]).toEqual([0, 0, 50, -50])
    expect([...inst.radios]).toEqual([4, 2.5])
    expect([...inst.nace]).toEqual([0, 3])
    expect([...inst.muere]).toEqual([2, 0])
    expect([...inst.silvestre]).toEqual([1, 0])
    expect(inst.semillas.length).toBe(2)
    expect([...instanciasArboles(datos, coords).semillas]).toEqual([...inst.semillas])
    expect(inst.semillas[0]).not.toBe(inst.semillas[1])
  })

  test('datos sin muere ni silvestre (un arboles.bin viejo ya decodificado): nadie muere, ninguno es silvestre', () => {
    const { muere, silvestre, ...viejos } = datos
    const inst = instanciasArboles(viejos, coords)
    expect([...inst.muere]).toEqual([0, 0])
    expect([...inst.silvestre]).toEqual([0, 0])
  })
})

describe('crearArboles', () => {
  const { U } = crearMaterialCiudad({ plano: { ancho: 1000, alto: 1000, plaza: [500, 500] }, metro: 0.5, mapa: null })
  const malla = crearArboles({ datos, coords, U })

  test('se apoyan en el mismo suelo que la ciudad: con sus terrazas (src/relieve.js), también desde el sol', () => {
    expect(malla.material.uniforms.uTerrazaMedida).toBe(U.uTerrazaMedida)
    expect(malla.customDepthMaterial.uniforms.uTerrazaMarco).toBe(U.uTerrazaMarco)
  })

  const grupos = malla.userData.grupos
  const deVida = (nace) => grupos.find((g) => g.nace === nace)

  test('un grupo "arboles" con dos mallas instanciadas por grupo de árboles: la de cerca y la de lejos', () => {
    expect(malla.isGroup).toBe(true)
    expect(malla.name).toBe('arboles')
    expect(malla.count).toBe(2)
    expect(grupos).toHaveLength(2) // dos vidas distintas: dos grupos de un árbol
    expect(malla.children).toHaveLength(4)
    for (const g of grupos) {
      for (const m of [g.cerca, g.lejos]) {
        expect(m).toBeInstanceOf(InstancedMesh)
        expect(m.count).toBe(1)
        expect(m.material).toBe(malla.material)
        expect(m.customDepthMaterial).toBe(malla.customDepthMaterial)
        expect(m.castShadow).toBe(true)
        expect(m.frustumCulled).toBe(true) // con su esfera apoyada en el relieve (actualizar)
      }
    }
  })

  test('la de lejos es la copa sola en 20 triángulos; la de cerca, el árbol entero; comparten sus instancias', () => {
    const g = deVida(3)
    expect(g.lejos.geometry.attributes.position.count).toBe(60)
    expect(g.cerca.geometry.attributes.position.count).toBe(270)
    expect([...new Set(g.lejos.geometry.attributes.aParte.array)]).toEqual([0]) // sin tronco
    expect(g.lejos.instanceMatrix).toBe(g.cerca.instanceMatrix)
    expect(g.lejos.geometry.attributes.aArbol).toBe(g.cerca.geometry.attributes.aArbol)
  })

  test('cada instancia está en su lugar, escalada por su radio', () => {
    const m = deVida(3).cerca.instanceMatrix.array
    expect([m[12], m[13], m[14]]).toEqual([50, 0, -50])
    expect(m[0]).toBeCloseTo(2.5)
  })

  test('comparte los uniforms de la ciudad: tinta/color, ola, épocas y relieve cambian juntos', () => {
    const u = malla.material.uniforms
    for (const k of ['uColor', 'uOla', 'uAnchoOla', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca', 'tRelieve', 'uRelieveHoja', 'uExageracion']) {
      expect(u[k]).toBe(U[k])
    }
  })

  test('el shader apoya el árbol en el suelo y lo esconde antes de que nazca', () => {
    const { vertexShader } = malla.material
    expect(vertexShader).toContain('sueloEn(')
    expect(vertexShader).toContain('aArbol')
    expect(vertexShader).toMatch(/epocaAqui/)
  })

  test('cada instancia lleva nace, muere, semilla y silvestre; el shader la esconde cuando muere', () => {
    const [monte, plantado] = [deVida(0).cerca.geometry.attributes.aArbol, deVida(3).cerca.geometry.attributes.aArbol]
    expect(monte.itemSize).toBe(4)
    expect([monte.array[0], monte.array[1], monte.array[3]]).toEqual([0, 2, 1])
    expect([plantado.array[0], plantado.array[1], plantado.array[3]]).toEqual([3, 0, 0])
    expect(malla.material.vertexShader).toMatch(/vivoEn\(aArbol\.xy/)
  })

  test('el monte (los silvestres) solo se ve en color: en tinta el plano queda como estaba', () => {
    expect(malla.material.vertexShader).toMatch(/mix\(1\.0, uColor, aArbol\.w\)/)
  })
})

describe('gruposDeArboles', () => {
  const inst = { posiciones: new Float32Array([10, 10, 20, 30, 1500, 10, 15, 15]), nace: [0, 0, 0, 2], muere: [0, 0, 0, 0], silvestre: [1, 1, 1, 0] }
  test('junta los de la misma baldosa y la misma vida; cada árbol va a un solo grupo', () => {
    const grupos = gruposDeArboles(inst, 1024)
    expect(grupos.map((g) => [g.id, g.indices])).toEqual([['0,0|0-0s', [0, 1]], ['1,0|0-0s', [2]], ['0,0|2-0', [3]]])
    expect(grupos[0]).toMatchObject({ nace: 0, muere: 0, silvestre: true })
    expect(grupos[2].silvestre).toBe(false)
  })
  test('por omisión, baldosas de 2 km: menos grupos son menos llamadas de dibujo', () => {
    expect(gruposDeArboles(inst)).toHaveLength(2)
  })
})

describe('detalleDeGrupo', () => {
  const vista = { epocas: [1, 1], color: 1, distancia: 100 }
  test('de cerca el árbol entero y de lejos la copa simple', () => {
    expect(detalleDeGrupo({ nace: 0, muere: 0, silvestre: false }, vista)).toBe('cerca')
    expect(detalleDeGrupo({ nace: 0, muere: 0, silvestre: false }, { ...vista, distancia: DIST_DETALLE_M + 1 })).toBe('lejos')
  })
  test('lo que no vive en la época que se mira no se dibuja; en la ola, lo de las dos épocas', () => {
    expect(detalleDeGrupo({ nace: 3, muere: 0, silvestre: false }, vista)).toBe(null)
    expect(detalleDeGrupo({ nace: 0, muere: 1, silvestre: false }, vista)).toBe(null)
    expect(detalleDeGrupo({ nace: 3, muere: 0, silvestre: false }, { ...vista, epocas: [1, 3] })).toBe('cerca')
  })
  test('el monte no se dibuja en tinta, y sí apenas hay color', () => {
    expect(detalleDeGrupo({ nace: 0, muere: 0, silvestre: true }, { ...vista, color: 0 })).toBe(null)
    expect(detalleDeGrupo({ nace: 0, muere: 0, silvestre: true }, { ...vista, color: 0.05 })).toBe('cerca')
  })
})

describe('actualizar: qué malla de cada grupo se dibuja', () => {
  const { U } = crearMaterialCiudad({ plano: { ancho: 1000, alto: 1000, plaza: [500, 500] }, metro: 0.5, mapa: null })
  const arboles = crearArboles({ datos, coords, U })
  const [monte, plantado] = [arboles.userData.grupos.find((g) => g.silvestre), arboles.userData.grupos.find((g) => !g.silvestre)]
  const camaraEn = (x, y, z) => { const c = new PerspectiveCamera(); c.position.set(x, y, z); c.updateMatrixWorld(); return c }
  const visibles = (g) => [g.cerca.visible, g.lejos.visible]

  test('de cerca, en color, en la época 1: el monte entero (vive de 0 a 2) y el plantado (nace en 3) apagado', () => {
    const cuenta = arboles.actualizar({ camara: camaraEn(0, 50, 0), epocas: [1, 1], color: 1 })
    expect(visibles(monte)).toEqual([true, false])
    expect(visibles(plantado)).toEqual([false, false])
    expect(cuenta).toEqual({ cerca: 1, lejos: 0 })
  })
  test('de lejos, la copa simple', () => {
    expect(arboles.actualizar({ camara: camaraEn(0, 5000, 0), epocas: [3, 3], color: 1 })).toEqual({ cerca: 0, lejos: 1 })
    expect(visibles(plantado)).toEqual([false, true])
    expect(visibles(monte)).toEqual([false, false]) // murió en la 2
  })
  test('en tinta el monte no se dibuja', () => {
    arboles.actualizar({ camara: camaraEn(0, 50, 0), epocas: [1, 1], color: 0 })
    expect(visibles(monte)).toEqual([false, false])
  })
  test('sin línea de tiempo, los que no mueren', () => {
    arboles.actualizar({ camara: camaraEn(0, 50, 0), color: 1 })
    expect(visibles(plantado)).toEqual([true, false])
    expect(visibles(monte)).toEqual([false, false])
  })
  test('la esfera de cada grupo cubre sus árboles en la hoja lisa y, con relieve, también levantados', () => {
    arboles.actualizar({ camara: camaraEn(0, 50, 0), color: 1 })
    const lisa = plantado.cerca.boundingSphere.clone()
    expect(lisa.center.x).toBeCloseTo(50)
    expect(lisa.center.z).toBeCloseTo(-50)
    expect(lisa.radius).toBeGreaterThan(2.5)
    expect(plantado.lejos.boundingSphere).toBe(plantado.cerca.boundingSphere)
    arboles.actualizar({ camara: camaraEn(0, 50, 0), color: 1, alturaEn: () => 300 })
    const alzada = plantado.cerca.boundingSphere
    expect(alzada.radius).toBeGreaterThan(lisa.radius + 100)
    for (const y of [0, 300]) expect(Math.hypot(50 - alzada.center.x, y - alzada.center.y, -50 - alzada.center.z)).toBeLessThan(alzada.radius)
  })
})
