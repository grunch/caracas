import {test,expect} from '@playwright/test'
import {gunzipSync} from 'node:zlib'
import {decodificarPak} from '../../src/pak.js'

test('1843 conserva tejido colonial y expansión tras el retiro exclusivo de 1772',async({page})=>{
 // tres cambios de época y de cámara que avanzan por cuadros: con render por software (CI) cada uno tarda decenas de segundos
 test.setTimeout(180_000)
 const respuesta=await page.request.get('/datos/ciudad.pak');expect(respuesta.ok()).toBe(true)
 const bytes=await respuesta.body(),b=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes
 const d=decodificarPak(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),{vida:Uint32Array,paletas:Uint8Array,historia:Uint8Array},()=>{})
 test.skip(!d.paletas?.some((p,i)=>p>0&&d.vida[i]%8===1&&(!(d.vida[i]>>3)||(d.vida[i]>>3)>=3)),'El release aún no incluye la continuidad de las manzanas en 1843')
 const vivos=e=>Array.from(d.vida).flatMap((v,i)=>v%8<=e&&(!(v>>3)||e<(v>>3))?[i]:[])
 const antes=vivos(1),despues=vivos(2),indices=new Set(despues)
 // Las versiones retraídas terminan en 1843; las demás deben seguir presentes.
 expect(antes.every(i=>indices.has(i)||d.vida[i]===17)).toBe(true);expect(despues.length).toBeGreaterThan(antes.length)
 expect(despues.every(i=>d.paletas[i]>0)).toBe(true)
 expect(antes.every(i=>d.historia[i*6+1]===d.historia[i*6+2])).toBe(true)
 const continua1911=antes.some(i=>d.paletas[i]>0&&(!(d.vida[i]>>3)||(d.vida[i]>>3)>4))
 const errores=[];page.on('pageerror',e=>errores.push(e.message))
 await page.goto('/?sinintro&sinsw&detallecasas=1&verbalcones')
 await page.waitForFunction(()=>window.lab?.ready&&window.lab.casasListas&&window.lab.detalleColonial?.cuenta.mallas>0)
 const inicial=await page.evaluate(()=>window.lab.detalleColonial.cuenta)
 await page.evaluate(()=>window.lab.lineaDeTiempo.elegir(2))
 await page.waitForFunction(()=>window.lab.ciudad.U.uEpocaA.value===2&&window.lab.ciudad.U.uOlaEpoca.value>=9000)
 const actual=await page.evaluate(()=>window.lab.detalleColonial.cuenta)
 expect(actual.mallas).toBe(inicial.mallas);expect(actual.unidades.map(m=>m.balcones)).toEqual(inicial.unidades.map(m=>m.balcones))
 await page.evaluate(()=>window.lab.lineaDeTiempo.elegir(4))
 // la ola avanza por cuadros (paso máximo de 1 s con render por software): se espera que termine, no un plazo fijo; después, un cuadro más (por software tarda segundos)
 await page.waitForFunction(()=>window.lab.ciudad.U.uEpocaA.value===4&&window.lab.ciudad.U.uOlaEpoca.value>=9000)
 if(continua1911)await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:30000}).toBeGreaterThan(0)
 else await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:30000}).toBe(0)
 expect(errores).toEqual([])
})
