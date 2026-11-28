import {test,expect} from '@playwright/test'
import {gunzipSync} from 'node:zlib'
import {decodificarPak} from '../../src/pak.js'
import sharp from 'sharp'
import epocas from '../../src/manzanas/epocas-completas.json' with {type:'json'}
import {AÑOS_DE_EPOCA} from '../../src/fichas.js'
import {hitosConPlanta} from '../../src/hitos/plantas.js'
import {muertesSinR13,recintosDe} from './continuidad-r13.js'
const INDICES=['suelo-manzanas-modernas','suelo-manzanas']
// el campo de distancia a las manzanas de un año (un canal de una de las dos imágenes que sirve el sitio)
async function campoDe(page,año){
 for(const n of INDICES){
  const r=await page.request.get(`/datos/${n}.json`);if(!r.ok()||!(r.headers()['content-type']??'').includes('json'))continue
  const m=await r.json();if(!m.canales.includes(año))continue
  const {data,info}=await sharp(await(await page.request.get(`/${m.imagen}`)).body()).raw().toBuffer({resolveWithObject:true})
  expect([info.width,info.height]).toEqual([m.ancho,m.alto])
  return {campo:{caja:m.caja,ancho:m.ancho,alto:m.alto,canales:info.channels,datos:data},canal:m.canales.indexOf(año)}
 }
 throw new Error(`El sitio no sirve el campo de manzanas de ${año}`)
}
for(const año of epocas)test(`manzanas completas, patios verdes y continuidad en ${año}`,async({page})=>{
 test.setTimeout(180000)
 const m=await page.request.get('/datos/suelo-manzanas-modernas.json')
 test.skip(!m.ok()||!(m.headers()['content-type']??'').includes('json'),'El release todavía no contiene el suelo de manzanas modernas')
 const meta=await m.json();test.skip(!meta.canales.includes(año),`El paquete todavía no incluye ${año}`)
 const r=await page.request.get('/datos/ciudad.pak'),bytes=await r.body(),b=bytes[0]===31?gunzipSync(bytes):bytes
 const d=decodificarPak(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),{vertices:Float32Array,techos:Uint32Array,vida:Uint32Array,paletas:Uint8Array},()=>{})
 const e=AÑOS_DE_EPOCA.indexOf(año),vivos=e=>Array.from(d.vida).flatMap((v,i)=>v%8<=e&&(!(v>>3)||e<(v>>3))?[i]:[])
 const anterior=vivos(e-1),ahora=new Set(vivos(e))
 // continuidad, con la R13 (specs/13): una casa en pie en la época anterior solo falta si un hito retiró su manzana entera.
 // No se compara la cantidad de casas: en el km² de la muestra, El Silencio retira en 1946 más de las que nacen.
 const huella=i=>Array.from({length:d.techos[i*4+1]},(_,k)=>[0,1].map(c=>d.vertices[2*(d.techos[i*4]+k)+c]))
 const muertas=anterior.filter(i=>!ahora.has(i)).map(i=>({casa:i,huella:huella(i)}))
 if(muertas.length)expect(muertesSinR13({muertas,antes:await campoDe(page,AÑOS_DE_EPOCA[e-1]),ahora:await campoDe(page,año),recintos:recintosDe(hitosConPlanta(),e)})).toEqual([])
 expect([...ahora].every(i=>d.paletas[i]>0)).toBe(true)
 const errores=[];page.on('pageerror',x=>errores.push(x.message));page.on('console',x=>{if(x.type()==='error'&&/shader|GLSL|VALIDATE_STATUS/.test(x.text()))errores.push(x.text())})
 await page.goto('/?sinintro&sinsw&detallecasas=1&verbalcones')
 await page.waitForFunction(()=>window.lab?.ready&&lab.casasListas&&lab.lineaDeTiempo)
 await page.evaluate(e=>lab.lineaDeTiempo.elegir(e),e)
 await page.waitForFunction(e=>lab.ciudad.U.uEpocaA.value===e&&lab.ciudad.U.uOlaEpoca.value>=9000,e)
 await expect.poll(()=>page.evaluate(k=>lab.ciudad.U.uManzanasModernasCanales.value.toArray()[k],e-4)).toBe(1)
 await expect.poll(()=>page.evaluate(()=>lab.detalleColonial.cuenta.mallas)).toBeGreaterThan(0)
 expect(errores).toEqual([])
})
