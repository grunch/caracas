import {test,expect} from '@playwright/test'
import {gunzipSync} from 'node:zlib'
import {decodificarPak} from '../../src/pak.js'
test('piloto colonial: balcones de cerca, LOD distante y transición 1772–1843 y apagado en otras épocas',async({page})=>{
 const respuesta=await page.request.get('/datos/ciudad.pak');expect(respuesta.ok()).toBe(true)
 const bytes=await respuesta.body(),b=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes
 const datos=decodificarPak(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),{paletas:Uint8Array},()=>{})
 test.skip(!datos.paletas?.some(p=>p>0),'El release de datos aún no incluye las casas coloniales de #211')
 const errores=[];page.on('pageerror',e=>errores.push(e.message))
 await page.goto('/?sinintro&sinsw&detallecasas=1&verbalcones')
 await page.waitForFunction(()=>window.lab?.ready&&window.lab.casasListas&&window.lab.detalleColonial?.cuenta.mallas>0)
 const inicial=await page.evaluate(()=>window.lab.detalleColonial.cuenta)
 // Con render por software (CI) la capa va liviana y no pasa del nivel 1; con GPU, de cerca, llega al 2.
 const nivelCercano=inicial.liviano?1:2
 expect(inicial.unidades.filter(m=>m.epoca===1)).toHaveLength(3);expect(inicial.unidades.some(m=>m.nivel===nivelCercano&&m.balcones>0)).toBe(true)
 await page.evaluate(()=>window.lab.cam.jump({x:0,z:0,dist:2500,yaw:0,pitch:1}))
 await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas)).toBe(0)
 await page.evaluate(()=>{window.lab.cam.jump(window.lab.detalleColonial.vista);window.lab.lineaDeTiempo.elegir(3)})
 await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:15000}).toBe(0)
 await page.evaluate(()=>window.lab.lineaDeTiempo.elegir(1))
 await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas)).toBeGreaterThan(0)
 expect(errores).toEqual([])
})

test('1843: vista directa, fachadas propias y transición de ida y vuelta',async({page})=>{
 const errores=[];page.on('pageerror',e=>errores.push(e.message))
 await page.goto('/?sinintro&sinsw&detallecasas=1&verbalcones=1843')
 await page.waitForFunction(()=>window.lab?.ready&&window.lab.casasListas&&window.lab.lineaDeTiempo.actual===2)
 await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.unidades.filter(m=>m.epoca===2).reduce((s,m)=>s+m.triangulos,0))).toBeGreaterThan(0)
 const inicial=await page.evaluate(()=>window.lab.detalleColonial.cuenta)
 expect(inicial.unidades.filter(m=>m.epoca===2&&m.balcones>0)).toHaveLength(3)
 for(const epoca of [3,4,5]){
  await page.evaluate(e=>window.lab.lineaDeTiempo.elegir(e),epoca)
  await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:15000}).toBe(0)
 }
 await page.evaluate(()=>window.lab.lineaDeTiempo.elegir(2))
 await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:15000}).toBeGreaterThan(0)
 expect(errores).toEqual([])
})
