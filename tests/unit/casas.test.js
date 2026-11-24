import { describe, it, expect } from 'vitest'
import { MeshBasicMaterial } from 'three'
import { crearCasas } from '../../src/casas.js'
import { partesDeCiudad } from '../../src/ciudad-pedido.js'
import { empacarTecho } from '../../src/ciudad.js'
import { materialDeSombraDe } from '../../src/acabado.js'
import { SIN_LINEA_DE_TIEMPO } from '../../src/epocas.js'

const plano = { ancho: 8000, alto: 8000, metro: 0.5, plaza: [4000, 4000] }
const casa = (x, z) => [x, z, x + 10, z, x + 10, z + 24, x, z + 24].map((m) => m / plano.metro + 4000)
// junto a la plaza: una casa de siempre, una que muere en la 3 y una que nace en la 4; a 1,5 km, una que nace en la 5
const datos = {
  vertices: new Float32Array([...casa(0, 0), ...casa(10, 0), ...casa(20, 0), ...casa(1500, 40)]),
  techos: new Uint32Array([0, 1, 2, 3].flatMap((k) => [k * 4, 4, empacarTecho({ pisos: 1, estilo: 0 }), 5 + k])),
  vida: new Uint32Array([1, 1 + 8 * 3, 4, 5]),
}
const baldosasDe = (pedido) => [...partesDeCiudad({ datos, plano, ...pedido })].filter((m) => m.baldosa).map((m) => m.baldosa)

function ciudad() {
  const material = new MeshBasicMaterial()
  const materialDeSombra = new MeshBasicMaterial()
  const casas = crearCasas({ material, materialDeSombra })
  const mallas = baldosasDe({}).map((b) => casas.agregar(b))
  return { casas, mallas, material, materialDeSombra }
}
const dibujados = (malla) => (malla.visible ? malla.geometry.groups.reduce((s, g) => s + g.count, 0) : 0)

describe('crearCasas', () => {
  it('una malla por baldosa en el grupo, con el material de la ciudad en un array y su material de sombra', () => {
    const { casas, mallas, material, materialDeSombra } = ciudad()
    expect(casas.grupo.children).toEqual(mallas)
    expect(mallas).toHaveLength(2)
    for (const m of mallas) {
      expect(m.material).toEqual([material])
      expect(m.customDepthMaterial).toBe(materialDeSombra)
      expect(m.castShadow).toBe(true)
      expect(m.renderOrder).toBeLessThan(0) // antes que el suelo, que queda en 0
      expect(materialDeSombraDe(m)).toEqual([materialDeSombra])
    }
    expect(casas.baldosas.map((b) => b.id)).toEqual(['0,0', '2,0'])
  })
  it('sin línea de tiempo se dibujan solo las casas que no mueren', () => {
    const { casas, mallas } = ciudad()
    const [centro, lejos] = mallas
    const { tramos } = casas.baldosas[0]
    expect(dibujados(centro)).toBe(tramos.filter((t) => t.muere === 0).reduce((s, t) => s + t.cuantos, 0))
    expect(lejos.visible).toBe(true)
    expect(casas.ponerEpocas(SIN_LINEA_DE_TIEMPO, SIN_LINEA_DE_TIEMPO)).toBe(false) // nada cambió: no rehace nada
  })
  it('en cada época se dibuja lo que vive en ella, y una baldosa sin nada vivo no se dibuja', () => {
    const { casas, mallas } = ciudad()
    const [centro, lejos] = mallas
    const de = (nace, muere) => casas.baldosas[0].tramos.find((t) => t.nace === nace && t.muere === muere).cuantos
    expect(casas.ponerEpocas(1, 1)).toBe(true)
    // (la casa de siempre va en dos tramos: hasta la época 3, en que muere su vecina, y desde ella)
    expect(dibujados(centro)).toBe(de(1, 3))
    expect(lejos.visible).toBe(false)
    casas.ponerEpocas(5, 5)
    expect(dibujados(centro)).toBe(de(3, 0) + de(4, 0))
    expect(centro.geometry.groups).toHaveLength(1) // las que no mueren van seguidas: una sola llamada
    expect(lejos.visible).toBe(true)
    casas.ponerEpocas(1, 5) // la ola de la 1 a la 5: todo lo que vive entre las dos
    expect(dibujados(centro)).toBe(centro.geometry.index.count)
    for (const g of centro.geometry.groups) expect(g.materialIndex).toBe(0)
  })
  it('una baldosa que llega después toma las épocas y el relieve de ahora', () => {
    const casas = crearCasas({ material: new MeshBasicMaterial(), materialDeSombra: new MeshBasicMaterial() })
    casas.ponerEpocas(1, 1)
    casas.ponerRelieve(() => 100)
    const [centro, lejos] = baldosasDe({}).map((b) => casas.agregar(b))
    expect(lejos.visible).toBe(false)
    expect(centro.visible).toBe(true)
    expect(centro.geometry.boundingSphere.center.y).toBeGreaterThan(40)
  })
  it('la esfera de cada baldosa cubre la hoja lisa y, con relieve, también la baldosa levantada', () => {
    const { casas, mallas } = ciudad()
    const [centro] = mallas
    const lisa = centro.geometry.boundingSphere.clone()
    expect(lisa.radius).toBeCloseTo(casas.baldosas[0].esfera.radio, 10)
    casas.ponerRelieve((x) => 200 + x) // una ladera
    const alzada = centro.geometry.boundingSphere
    expect(alzada.radius).toBeGreaterThan(lisa.radius + 100)
    // un punto de la baldosa, en la hoja y arriba en la ladera, queda dentro
    const [x, , z] = casas.baldosas[0].esfera.centro
    for (const y of [0, 200 + x]) expect(Math.hypot(x - alzada.center.x, y - alzada.center.y, z - alzada.center.z)).toBeLessThan(alzada.radius)
    casas.ponerRelieve(null)
    expect(centro.geometry.boundingSphere.radius).toBeCloseTo(lisa.radius, 10)
  })
  it('dice hasta dónde llegan las casas y cuánto hay y se dibuja', () => {
    const { casas } = ciudad()
    expect(casas.alcance).toBeGreaterThan(1500)
    expect(casas.alcance).toBeLessThan(1600)
    const todo = casas.cuenta
    expect(todo.baldosas).toBe(2)
    expect(todo.vertices).toBeGreaterThan(0)
    expect(todo.vivos).toBeLessThan(todo.indices) // sin línea de tiempo, la casa que muere no se dibuja
    casas.ponerEpocas(1, 5)
    expect(casas.cuenta.vivos).toBe(todo.indices)
  })
  it('los dos pases de una baldosa son dos mallas, cada una con su nombre', () => {
    const casas = crearCasas({ material: new MeshBasicMaterial(), materialDeSombra: new MeshBasicMaterial() })
    const mallas = baldosasDe({ primera: 1 }).map((b) => casas.agregar(b))
    expect(mallas.map((m) => m.name)).toEqual(['casas 0,0 · pase 0', 'casas 0,0 · pase 1', 'casas 2,0 · pase 1'])
  })
})

describe('soltarArreglos', () => {
  it('con la opción, las geometrías sueltan sus arreglos al subirse; sin ella, no', () => {
    const material = new MeshBasicMaterial()
    const con = crearCasas({ material, materialDeSombra: material, soltarArreglos: true }).agregar(baldosasDe({})[0])
    con.geometry.attributes.position.onUploadCallback()
    expect(con.geometry.attributes.position.array).toBe(null)
    const sin = crearCasas({ material, materialDeSombra: material }).agregar(baldosasDe({})[0])
    sin.geometry.attributes.position.onUploadCallback()
    expect(sin.geometry.attributes.position.array).not.toBe(null)
  })
})

describe('subirUna: las baldosas que no se vieron se suben de a una', () => {
  /** Un renderer de mentira: anota qué geometría dibuja, con qué rango y a qué destino. */
  function rendererFalso() {
    const r = {
      destino: 'pantalla', dibujos: [],
      getRenderTarget: () => r.destino,
      setRenderTarget: (d) => { r.destino = d },
      render(escena) {
        const [malla] = escena.children
        r.dibujos.push({ geometria: malla.geometry, rango: { ...malla.geometry.drawRange }, aPantalla: r.destino === 'pantalla' })
      },
    }
    return r
  }
  it('sube una por llamada, fuera de la pantalla y con un solo triángulo, y deja todo como estaba', () => {
    const { casas, mallas } = ciudad()
    const renderer = rendererFalso()
    expect(casas.subirUna(renderer)).toBe(true)
    expect(renderer.dibujos).toEqual([{ geometria: mallas[0].geometry, rango: { start: 0, count: 3 }, aPantalla: false }])
    expect(renderer.destino).toBe('pantalla')
    expect(mallas[0].geometry.drawRange).toEqual({ start: 0, count: Infinity })
    expect(casas.subirUna(renderer)).toBe(true)
    expect(renderer.dibujos[1].geometria).toBe(mallas[1].geometry)
    expect(casas.subirUna(renderer)).toBe(false)
    expect(renderer.dibujos).toHaveLength(2)
  })
  it('una baldosa que ya se dibujó en la escena no se vuelve a subir', () => {
    const { casas, mallas } = ciudad()
    mallas[0].onAfterRender()
    const renderer = rendererFalso()
    casas.subirUna(renderer)
    expect(renderer.dibujos.map((d) => d.geometria)).toEqual([mallas[1].geometry])
    expect(casas.subirUna(renderer)).toBe(false)
  })
  it('si dibujar falla, igual deja el destino y el rango como estaban', () => {
    const { casas, mallas } = ciudad()
    const renderer = { ...rendererFalso(), render() { throw new Error('contexto perdido') } }
    renderer.getRenderTarget = () => 'pantalla'
    const puestos = []
    renderer.setRenderTarget = (d) => puestos.push(d)
    expect(() => casas.subirUna(renderer)).toThrow('contexto perdido')
    expect(puestos.at(-1)).toBe('pantalla')
    expect(mallas[0].geometry.drawRange.count).toBe(Infinity)
  })
})

describe('materialDeSombraDe', () => {
  it('una malla de un solo material se dibuja en el mapa de sombras con su material de profundidad', () => {
    const sombra = new MeshBasicMaterial()
    expect(materialDeSombraDe({ material: new MeshBasicMaterial(), customDepthMaterial: sombra })).toBe(sombra)
  })
})
