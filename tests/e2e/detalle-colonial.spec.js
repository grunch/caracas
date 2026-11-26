import {test,expect} from '@playwright/test'
import {gunzipSync} from 'node:zlib'
import {decodificarPak} from '../../src/pak.js'
test('piloto colonial: balcones de cerca, LOD distante y continuidad según las épocas del paquete',async({page})=>{
 // tres cambios de época y de cámara que avanzan por cuadros: con render por software (CI) cada uno tarda decenas de segundos
 test.setTimeout(180_000)
 const respuesta=await page.request.get('/datos/ciudad.pak');expect(respuesta.ok()).toBe(true)
 const bytes=await respuesta.body(),b=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes
 const datos=decodificarPak(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),{paletas:Uint8Array,vida:Uint32Array,vertices:Float32Array,techos:Uint32Array},()=>{})
 test.skip(!datos.paletas?.some(p=>p>0),'El release de datos aún no incluye las casas coloniales de #211')
 const anclas1911=Array.from(datos.vida).flatMap((v,i)=>{
  if(!(datos.paletas[i]>0&&v%8>=1&&v%8<4&&(!(v>>3)||(v>>3)>4)))return []
  const inicio=datos.techos[i*4],n=datos.techos[i*4+1],centro=[0,0]
  for(let k=0;k<n;k++)for(let c=0;c<2;c++)centro[c]+=datos.vertices[(inicio+k)*2+c]/n
  return [centro]
 })
 const errores=[];page.on('pageerror',e=>errores.push(e.message))
 await page.goto('/?sinintro&sinsw&detallecasas=1&verbalcones')
 await page.waitForFunction(()=>window.lab?.ready&&window.lab.casasListas&&window.lab.detalleColonial?.cuenta.mallas>0)
 const continua1911=await page.evaluate(async anclas=>{
  const {PILOTO_COLONIAL}=await import('/src/detalle-colonial-plan.js')
  const {puntoEnPoligono}=await import('/src/hitos/suprimir.js')
  return anclas.some(p=>PILOTO_COLONIAL.some(m=>puntoEnPoligono(p,m.poligono)))
 },anclas1911)
 const inicial=await page.evaluate(()=>window.lab.detalleColonial.cuenta)
 // Con render por software (CI) la capa va liviana y no pasa del nivel 1; con GPU, de cerca, llega al 2.
 const nivelCercano=inicial.liviano?1:2
 expect(inicial.unidades).toHaveLength(3);expect(inicial.unidades.some(m=>m.nivel===nivelCercano&&m.balcones>0)).toBe(true)
 await page.evaluate(()=>window.lab.cam.jump({x:0,z:0,dist:2500,yaw:0,pitch:1}))
 await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:30000}).toBe(0)
 await page.evaluate(()=>{window.lab.cam.jump(window.lab.detalleColonial.vista);window.lab.lineaDeTiempo.elegir(4)})
 // la ola avanza por cuadros (paso máximo de 1 s con render por software): se espera que termine, no un plazo fijo; después, un cuadro más (por software tarda segundos)
 await page.waitForFunction(()=>window.lab.ciudad.U.uEpocaA.value===4&&window.lab.ciudad.U.uOlaEpoca.value>=9000)
 if(continua1911)await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:30000}).toBeGreaterThan(0)
 else await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:30000}).toBe(0)
 await page.evaluate(()=>window.lab.lineaDeTiempo.elegir(1))
 await page.waitForFunction(()=>window.lab.ciudad.U.uEpocaA.value===1&&window.lab.ciudad.U.uOlaEpoca.value>=9000)
 await expect.poll(()=>page.evaluate(()=>window.lab.detalleColonial.cuenta.mallas),{timeout:30000}).toBeGreaterThan(0)
 expect(errores).toEqual([])
})
