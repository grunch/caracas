import {test,expect} from '@playwright/test'
import {gunzipSync} from 'node:zlib'
import {decodificarPak} from '../../src/pak.js'

test('1889 mantiene las casas generadas de 1843 y añade tejido con la misma paleta',async({page})=>{
 const respuesta=await page.request.get('/datos/ciudad.pak');expect(respuesta.ok()).toBe(true)
 const bytes=await respuesta.body(),b=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes
 const d=decodificarPak(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),{vida:Uint32Array,paletas:Uint8Array,historia:Uint8Array},()=>{})
 test.skip(!d.paletas?.some((p,i)=>p>0&&d.vida[i]===34),'El release aún no incluye la continuidad de las manzanas en 1889')
 const vivos=e=>Array.from(d.vida).flatMap((v,i)=>v%8<=e&&(!(v>>3)||e<(v>>3))?[i]:[])
 const antes=vivos(2),despues=vivos(3),indices=new Set(despues)
 expect(antes.every(i=>indices.has(i))).toBe(true);expect(despues.length).toBeGreaterThan(antes.length)
 expect(despues.every(i=>d.paletas[i]>0)).toBe(true)
 expect(antes.every(i=>d.historia[i*6+2]===d.historia[i*6+3])).toBe(true)
 const errores=[];page.on('pageerror',e=>errores.push(e.message))
 await page.goto('/?sinintro&sinsw&detallecasas=1&verbalcones')
 await page.waitForFunction(()=>window.lab?.ready&&window.lab.casasListas&&window.lab.detalleColonial?.cuenta.mallas>0)
 const inicial=await page.evaluate(()=>window.lab.detalleColonial.cuenta)
 await page.evaluate(()=>window.lab.lineaDeTiempo.elegir(3))
 await page.waitForFunction(()=>window.lab.ciudad.U.uEpocaA.value===3&&window.lab.ciudad.U.uOlaEpoca.value>=9000)
 const actual=await page.evaluate(()=>window.lab.detalleColonial.cuenta)
 expect(actual.mallas).toBe(inicial.mallas);expect(actual.unidades.map(m=>m.balcones)).toEqual(inicial.unidades.map(m=>m.balcones))
 await page.evaluate(()=>window.lab.lineaDeTiempo.elegir(4))
 // la ola avanza por cuadros (paso máximo de 1 s con render por software): se espera que termine, no un plazo fijo
 await page.waitForFunction(()=>window.lab.ciudad.U.uEpocaA.value===4&&window.lab.ciudad.U.uOlaEpoca.value>=9000)
 await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas)).toBe(0)
 expect(errores).toEqual([])
})
