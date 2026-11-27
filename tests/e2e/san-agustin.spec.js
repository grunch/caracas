import {test,expect} from '@playwright/test'
test.use({viewport:{width:400,height:300}})
test('San Agustín carga y se dibuja en 1936/1946 sin errores de shader',async({page})=>{
 const errores=[];page.on('pageerror',e=>errores.push(e.message))
 page.on('console',m=>{if(m.type()==='error'&&/shader|relieve|WebGLProgram/i.test(m.text()))errores.push(m.text())})
 await page.goto('/?sinintro&capture&sinsw');await page.waitForFunction(()=>window.lab?.ready)
 expect(await page.evaluate(()=>window.lab.hitos.userData.rangos.map(r=>r.id))).toContain('san-agustin')
 for(const epoca of [5,6]){
  await page.evaluate(e=>window.lab.lineaDeTiempo.elegir(e),epoca)
  if(epoca===6)await page.waitForFunction(()=>window.lab.hitosSilencio)
  await page.evaluate(()=>{const l=window.lab;l.levantar(true);l.cam.jump({x:394.5,z:967.1,dist:170,yaw:-.6,pitch:.85});l.cam.update(0);l.renderer.render(l.scene,l.camera)})
 }
 expect(errores).toEqual([])
})
