import { expect, test } from 'vitest'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion, suprimirTechos } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { contenidoDeFicha } from '../../src/fichas.js'

const plano = { ancho: 18600, alto: 14800, metro: .5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)
const hito = HITOS.find(h => h.id === 'casa-amarilla')

test('Ayuntamiento desde 1772 y cinco variantes excluyentes hasta 1936', () => {
  expect(hito.nace).toBe(1)
  for(let epoca=1;epoca<=5;epoca++){
    const partes=hito.partes.filter(p=>p.nace<=epoca&&(!p.muere||p.muere>epoca))
    expect(partes.map(p=>p.componente??'todo')).toEqual(epoca<3?['todo']:['cuerpo','cubiertas','bandera'])
    expect(partes.at(-1).anio).toBe([0,1772,1843,1889,1911,1936][epoca])
  }
  expect(validarHitos([hito], plano)).toEqual([])
})

test('el modelo mira a la plaza, conserva las vidas y usa el ancla del relieve', () => {
  const d = construirHitos([hito], coords), origen = coords.aMundo(hito.x,hito.y)
  const [ex,ez] = hito.eje.map(v => v/Math.hypot(...hito.eje))
  const vidas = new Set(); let maxA=-Infinity,minA=Infinity,maxB=0,bandera=0,errorAncla=0
  for(let i=0;i<d.vidas.length/2;i++){
    vidas.add(`${d.vidas[i*2]}:${d.vidas[i*2+1]}`)
    const x=d.posiciones[i*3]-origen.x,z=d.posiciones[i*3+2]-origen.z,y=d.posiciones[i*3+1]
    const a=x*ex+z*ez,b=-x*ez+z*ex
    maxA=Math.max(maxA,a);minA=Math.min(minA,a);maxB=Math.max(maxB,Math.abs(b))
    if(y>17){expect(a).toBeGreaterThan(26);expect(b).toBeLessThan(-4);bandera++}
    errorAncla=Math.max(errorAncla,Math.abs(d.anclas[i*4]-origen.x),Math.abs(d.anclas[i*4+1]-origen.z))
  }
  expect(bandera).toBeGreaterThan(0)
  expect([...vidas]).toEqual(['1:2','2:3','3:0','3:5','5:0','3:4','4:5'])
  expect(maxA).toBeLessThan(29);expect(minA).toBeGreaterThan(-28)
  expect(maxB).toBeLessThan(25);expect(errorAncla).toBeLessThan(.001)
  expect(d.posiciones.every(Number.isFinite)).toBe(true)
  expect(d.normales.every(Number.isFinite)).toBe(true)
  expect(d.indices.length/3).toBeLessThan(220_000)
}, 15_000)

test('las casas genéricas del solar se suprimen desde 1772 sin mutar sus datos', () => {
  const zonas=zonasDeSupresion([hito])
  expect(zonas[0]).toMatchObject({desde:1,hasta:0})
  const casa={vertices:new Float32Array(hito.planta[0].flat()),techos:new Uint32Array([0,4,1,0]),vida:new Uint32Array([0])}
  expect([...suprimirTechos(casa,zonas)]).toEqual([8])
  expect([...casa.vida]).toEqual([0])
})

test('la ficha cambia de nombre, incorpora 1810 y explica las hipótesis', () => {
  const marca=normalizarMarcas(MARCAS,{hitos:HITOS,coords}).find(m=>m.id===hito.id)
  for(const [epoca,titulo] of [[1,'Ayuntamiento y Real Cárcel'],[2,'Casa de Gobierno'],[3,'Casa Amarilla'],[4,'Casa Amarilla'],[5,'Casa Amarilla']]){
    const ficha=contenidoDeFicha({marca,ficha:FICHAS[hito.id],epoca})
    expect(ficha.existe).toBe(true);expect(ficha.titulo).toBe(titulo)
    expect(ficha.dudas).toMatch(/hipótesis|interpretativ/)
  }
  expect(FICHAS[hito.id].textos[0][1]).toContain('1810')
})

test('compartir fachada no omite ni duplica piezas respecto al modelo completo de cada año', async () => {
  const { crearCasaAmarilla } = await import('../../src/hitos/casa-amarilla-modelo.js')
  const d=construirHitos([hito],coords)
  for(const [i,anio] of [1772,1843,1889,1911,1936].entries()){
    const epoca=i+1;let visibles=0,esperados=0
    for(let j=0;j<d.indices.length;j+=3){
      const v=d.indices[j],nace=d.vidas[v*2],muere=d.vidas[v*2+1]
      if(nace<=epoca&&(!muere||epoca<muere))visibles++
    }
    const {edificio}=crearCasaAmarilla({anio}),geos=new Set(),mats=new Set()
    edificio.traverse(o=>{if(o.isMesh){esperados+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;geos.add(o.geometry);mats.add(o.material)}})
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())
    expect(visibles,`geometría visible en ${anio}`).toBe(esperados)
  }
})
