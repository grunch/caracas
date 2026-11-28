import {test,expect} from '@playwright/test'
import {gunzipSync} from 'node:zlib'
import {decodificarPak} from '../../src/pak.js'
import epocas from '../../src/manzanas/epocas-completas.json' with {type:'json'}
import {muertesSinR13En} from './continuidad-r13-pagina.js'
for(const año of epocas)test(`manzanas completas, patios verdes y continuidad en ${año}`,async({page})=>{
 test.setTimeout(180000)
 const m=await page.request.get('/datos/suelo-manzanas-modernas.json')
 test.skip(!m.ok()||!(m.headers()['content-type']??'').includes('json'),'El release todavía no contiene el suelo de manzanas modernas')
 const meta=await m.json();test.skip(!meta.canales.includes(año),`El paquete todavía no incluye ${año}`)
 const r=await page.request.get('/datos/ciudad.pak'),bytes=await r.body(),b=bytes[0]===31?gunzipSync(bytes):bytes
 const d=decodificarPak(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),{vertices:Float32Array,techos:Uint32Array,vida:Uint32Array,paletas:Uint8Array},()=>{})
 const e=[1911,1936,1946].indexOf(año)+4,vivos=e=>Array.from(d.vida).flatMap((v,i)=>v%8<=e&&(!(v>>3)||e<(v>>3))?[i]:[])
 const ahora=new Set(vivos(e))
 // continuidad, con la R13 (specs/13): una casa en pie en la época anterior solo falta si un hito retiró su manzana entera.
 // No se compara la cantidad de casas: en el km² de la muestra, El Silencio retira en 1946 más de las que nacen.
 expect(await muertesSinR13En(page,d,e)).toEqual([])
 expect([...ahora].every(i=>d.paletas[i]>0)).toBe(true)
 const errores=[];page.on('pageerror',x=>errores.push(x.message));page.on('console',x=>{if(x.type()==='error'&&/shader|GLSL|VALIDATE_STATUS/.test(x.text()))errores.push(x.text())})
 await page.goto('/?sinintro&sinsw&detallecasas=1&verbalcones')
 await page.waitForFunction(()=>window.lab?.ready&&lab.casasListas&&lab.lineaDeTiempo)
 await page.evaluate(e=>lab.lineaDeTiempo.elegir(e),e)
 await page.waitForFunction(e=>lab.ciudad.U.uEpocaA.value===e&&lab.ciudad.U.uOlaEpoca.value>=9000,e)
 // con la ciudad entera y render por software, la imagen del campo (4666 × 3715) y el detalle de cerca tardan más que los 5 s de un poll
 await expect.poll(()=>page.evaluate(k=>lab.ciudad.U.uManzanasModernasCanales.value.toArray()[k],e-4),{timeout:30000}).toBe(1)
 await expect.poll(()=>page.evaluate(()=>lab.detalleColonial.cuenta.mallas),{timeout:30000}).toBeGreaterThan(0)
 expect(errores).toEqual([])
})
