import {it,expect} from 'vitest'
import {nivelDetalle,extraerFrentes,piezasDeFrente} from '../../src/detalle-colonial-plan.js'
const m={id:'M',poligono:[[0,0],[20,0],[20,20],[0,20]]}
function paquete(){return {atributos:{position:new Float32Array([0,0,0,20,0,0,20,9.2,0,0,9.2,0]),normal:new Float32Array([0,0,-1,0,0,-1,0,0,-1,0,0,-1]),aPared:new Float32Array([0,20,4.6,20,20,4.6,20,20,4.6,0,20,4.6]),aInfo:new Uint16Array([10,123,256,2,10,123,256,2,10,123,256,2,10,123,256,2]),aVida:new Uint8Array([1,2,1,2,1,2,1,2]),aAncla:new Float32Array([10,10,10,10,10,10,10,10]),aTecho:new Float32Array(16)},indices:new Uint32Array([0,1,2,0,2,3])}}
it('LOD con histéresis, sin detalle lejano y nivel reducido en modo liviano',()=>{
 expect(nivelDetalle(100,0)).toBe(2);expect(nivelDetalle(300,0)).toBe(1);expect(nivelDetalle(500,2)).toBe(0)
 expect(nivelDetalle(185,2)).toBe(2);expect(nivelDetalle(185,1)).toBe(1)
 expect(nivelDetalle(100,0,true)).toBe(1)
})
it('extrae una fachada real una sola vez y conserva ancla, altura y semilla',()=>{
 const p=paquete(),antes=structuredClone(p),f=extraerFrentes(p,[m]);expect(f).toHaveLength(1)
 expect(f[0]).toMatchObject({manzana:'M',ancla:[10,10],altoPiso:expect.closeTo(4.6,5),pisos:2,semilla:123,largo:20})
 expect(p).toEqual(antes)
})
it('no agrega detalles en patios, fuera del piloto, otras épocas ni casas antiguas',()=>{
 const p=paquete();expect(extraerFrentes(p,[{...m,poligono:m.poligono.map(([x,z])=>[x+100,z])}])).toHaveLength(0)
 for(let i=0;i<4;i++)p.atributos.position[i*3+2]=5
 expect(extraerFrentes(p,[m])).toHaveLength(0)
 const q=paquete();q.atributos.aVida.fill(3);expect(extraerFrentes(q,[m])).toHaveLength(0)
 const r=paquete();for(let i=0;i<4;i++)r.atributos.aInfo[i*4+2]=0
 expect(extraerFrentes(r,[m])).toHaveLength(0)
})
it('los balcones sobresalen 70 cm y caben en su tramo; solo hay balcones en los altos',()=>{
 const [f]=extraerFrentes(paquete(),[m]),p=piezasDeFrente(f)
 const losas=p.filter(x=>x.tipo==='losa');expect(losas.length).toBe(5)
 for(const x of losas){expect(x.z+x.d/2).toBeCloseTo(.7);expect(x.x-x.w/2).toBeGreaterThanOrEqual(f.desde);expect(x.x+x.w/2).toBeLessThanOrEqual(f.hasta)}
 expect(p.some(x=>x.fino)).toBe(true)
 expect(piezasDeFrente({...f,pisos:1}).some(x=>x.tipo==='losa')).toBe(false)
})
it('las normales empaquetadas en bytes no agrandan la salida del balcón',()=>{
 const p=paquete();p.atributos.normal=Int8Array.from(p.atributos.normal,x=>x*127)
 const [f]=extraerFrentes(p,[m]);expect(Math.hypot(...f.normal)).toBeCloseTo(1)
})
it('fusiona las piezas y conserva vidas, anclas y apoyo de casa en el material',async()=>{
 const {geometriaDeDetalles,materialDeDetalles}=await import('../../src/detalle-colonial.js')
 const {crearMaterialCiudad}=await import('../../src/material.js')
 const [f]=extraerFrentes(paquete(),[m]),g=geometriaDeDetalles([f]),fino=geometriaDeDetalles([f],true)
 expect(g.index.count).toBeGreaterThan(0);expect(fino.index.count).toBeGreaterThan(0)
 for(let i=0;i<g.attributes.aVida.count;i++){expect(g.attributes.aVida.getX(i)).toBe(1);expect(g.attributes.aVida.getY(i)).toBe(2);expect(g.attributes.aAncla.getX(i)).toBe(10)}
 const {U,material}=crearMaterialCiudad({plano:{ancho:1000,alto:1000,plaza:[0,0],metro:.5},metro:.5,mapa:null}),d=materialDeDetalles(U)
 expect(d.uniforms.uOla).toBe(U.uOla);expect(d.vertexShader).toContain('float piso = sueloEn(aAncla.xy);');expect(d.vertexShader).toContain('float y = piso + position.y * sube * vExiste;')
 g.dispose();fino.dispose();d.dispose();material.dispose()
})
it('crea los lotes solo al acercarse, reutiliza la geometría y se apaga en otras épocas',async()=>{
 const {crearDetalleColonial}=await import('../../src/detalle-colonial.js'),{crearMaterialCiudad}=await import('../../src/material.js')
 const {U,material}=crearMaterialCiudad({plano:{ancho:1000,alto:1000,plaza:[0,0],metro:1},metro:1,mapa:null})
 const capa=crearDetalleColonial({U,coords:{aMundo:(x,z)=>({x,z})},manzanas:[m]})
 capa.agregar(paquete());capa.finalizar()
 expect(capa.cuenta.mallas).toBe(0);expect(capa.grupo.children).toHaveLength(0)
 expect(capa.actualizar({position:{x:10,y:600,z:10}},[1,1])).toBe(false)
 expect(capa.actualizar({position:{x:10,y:100,z:10}},[1,1])).toBe(true)
 expect(capa.cuenta.mallas).toBe(2);const g=capa.grupo.children[0].geometry
 capa.actualizar({position:{x:10,y:100,z:10}},[2,2]);expect(capa.cuenta.mallas).toBe(0)
 capa.actualizar({position:{x:10,y:100,z:10}},[1,1]);expect(capa.grupo.children[0].geometry).toBe(g)
 expect(capa.cuenta.liviano).toBe(false)
 expect(capa.vista).not.toBeNull();capa.liberar();material.dispose();expect(capa.grupo.children).toHaveLength(0)
})
it('la cuenta dice si la capa va en modo liviano (render por software): ahí el nivel no pasa de 1',async()=>{
 const {crearDetalleColonial}=await import('../../src/detalle-colonial.js'),{crearMaterialCiudad}=await import('../../src/material.js')
 const {U,material}=crearMaterialCiudad({plano:{ancho:1000,alto:1000,plaza:[0,0],metro:.5},metro:.5,mapa:null})
 const capa=crearDetalleColonial({U,coords:{aMundo:(x,z)=>({x,z})},manzanas:[m],liviano:true})
 capa.agregar(paquete());capa.finalizar();capa.actualizar({position:{x:10,y:100,z:10}},[1,1])
 expect(capa.cuenta.liviano).toBe(true);expect(capa.cuenta.unidades[0].nivel).toBe(1)
 capa.liberar();material.dispose()
})
function paquete1843({estilo=0,pisos=2}={}){
 const p=paquete();p.atributos.aHistoria=new Float32Array(8)
 for(let i=0;i<4;i++){p.atributos.aInfo[i*4+2]=1;p.atributos.aVida.set([0,4],i*2);p.atributos.aHistoria.set([16+16*256+(estilo+16*pisos)*65536,16],i*2)}
 return p
}
it('1843 lee estilo y pisos históricos, admite paleta nativa y limita la vida del detalle',async()=>{
 const p=paquete1843(),[f]=extraerFrentes(p,[m]);expect(f).toMatchObject({epoca:2,pisos:2,vida:[2,3]})
 const {geometriaDeDetalles}=await import('../../src/detalle-colonial.js');const g=geometriaDeDetalles([f]);expect(g.attributes.aVida.getX(0)).toBe(2);expect(g.attributes.aVida.getY(0)).toBe(3);g.dispose()
 expect(extraerFrentes(paquete1843({estilo:1}),[m])).toHaveLength(0)
 const [baja]=extraerFrentes(paquete1843({pisos:1}),[m]);expect(piezasDeFrente(baja).some(p=>p.tipo==='losa')).toBe(false)
})
it('1843 tolera el contorno rasterizado de calle pero excluye muros interiores e invertidos',()=>{
 const p=paquete1843();for(let i=0;i<4;i++)p.atributos.position[i*3+2]=1.5
 expect(extraerFrentes(p,[m])).toHaveLength(1)
 for(let i=0;i<4;i++)p.atributos.normal[i*3+2]=1
 expect(extraerFrentes(p,[m])).toHaveLength(0)
 for(let i=0;i<4;i++){p.atributos.normal[i*3+2]=-1;p.atributos.position[i*3+2]=5}
 expect(extraerFrentes(p,[m])).toHaveLength(0)
})
it('conserva lotes separados de 1772 y 1843 durante la ola y los reutiliza',async()=>{
 const {crearDetalleColonial}=await import('../../src/detalle-colonial.js'),{crearMaterialCiudad}=await import('../../src/material.js')
 const {U,material}=crearMaterialCiudad({plano:{ancho:1000,alto:1000,plaza:[0,0],metro:1},metro:1,mapa:null})
 const capa=crearDetalleColonial({U,coords:{aMundo:(x,z)=>({x,z})},manzanas:[m]}),cam={position:{x:10,y:100,z:10}}
 capa.agregar(paquete());capa.agregar(paquete1843());capa.finalizar();capa.actualizar(cam,[1]);expect(capa.cuenta.mallas).toBe(2)
 capa.actualizar(cam,[1,2]);expect(capa.cuenta.mallas).toBe(4);const geometrías=capa.grupo.children.map(m=>m.geometry)
 capa.actualizar(cam,[2]);expect(capa.cuenta.mallas).toBe(2);expect(capa.vistaParaEpoca(2)).not.toBeNull()
 for(const e of [0,3,4,5]){capa.actualizar(cam,[e]);expect(capa.cuenta.mallas).toBe(0)}
 capa.actualizar(cam,[1,2]);expect(capa.grupo.children.map(m=>m.geometry)).toEqual(geometrías)
 capa.liberar();material.dispose()
})
