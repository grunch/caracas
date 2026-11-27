import {it,expect} from 'vitest'
import {HITOS,construirHitos,validarHitos} from '../../src/hitos.js'
import {crearCoords} from '../../src/coords.js'
import {hitosConPlanta} from '../../src/hitos/plantas.js'
import {zonasDeSupresion,puntoEnPoligono} from '../../src/hitos/suprimir.js'
const plano={ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]},coords=crearCoords(plano)
const h=()=>HITOS.find(h=>h.id==='san-agustin')
it('San Agustín aparece en 1936 y continúa en 1946, después de su terminación de1930',()=>{
 expect(h()).toBeDefined();expect([h().nace,h().muere]).toEqual([5,0]);expect(validarHitos([h()],plano)).toEqual([])
 const d=construirHitos([h()],coords);expect(d.posiciones.every(Number.isFinite)).toBe(true)
 for(let i=0;i<d.vidas.length;i+=2)expect([...d.vidas.slice(i,i+2)]).toEqual([5,0])
})
it('la reserva solo ocupa el recinto, sin colegio norte, casa cural oeste ni calle de los Isleños',()=>{
 expect(h()).toBeDefined();const z=zonasDeSupresion([h()]);const dentro=p=>z.some(s=>puntoEnPoligono(p,s.poligono))
 expect(dentro([9756.5,8777])).toBe(true)
 for(const p of [[9760,8680],[9680,8777],[9820,8790],[9735,8880]])expect(dentro(p)).toBe(false)
 expect(hitosConPlanta().find(p=>p.id==='san-agustin')?.planta).toEqual(h().planta)
})
it('el modelo conserva alturas documentadas y cabe dentro de la envolvente nominal',async()=>{
 const {crearSanAgustin}=await import('../../src/hitos/san-agustin-modelo.js')
 const {Box3,Vector3}=await import('three');const e=crearSanAgustin(),b=new Box3().setFromObject(e),s=b.getSize(new Vector3())
 expect(b.max.y).toBeCloseTo(32,1);expect(s.x).toBeLessThan(32);expect(s.z).toBeLessThan(63)
 let cupula=0;const v=new Vector3();e.updateMatrixWorld(true);e.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.z<-5&&Math.abs(v.x)<5)cupula=Math.max(cupula,v.y)}});expect(cupula).toBeCloseTo(24,1)
})
it('la marca usa la ubicación del modelo y la ficha distingue evidencia e interpretación',async()=>{
 const {MARCAS}=await import('../../src/marcas-datos.js'),{FICHAS}=await import('../../src/fichas-datos.js')
 const m=MARCAS.find(m=>m.id==='san-agustin');expect(m.hito).toBe(h().id);expect(m.nace).toBe(h().nace);expect(m.alto).toBe(32)
 expect(m.x).toBeUndefined();expect(m.y).toBeUndefined()
 expect(FICHAS['san-agustin'].textos[0][0]).toBe(5);expect(FICHAS['san-agustin'].dudas).toContain('sin mensura catastral')
})
