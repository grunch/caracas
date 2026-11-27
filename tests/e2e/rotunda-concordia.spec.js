import {test,expect} from '@playwright/test'

test.use({viewport:{width:400,height:300}})
test('la cárcel carga al iniciar y Concordia llega al seleccionar 1946 sin errores de relieve ni shader',async({page})=>{
 const errores=[]
 page.on('pageerror',e=>errores.push(e.message))
 page.on('console',m=>{if(m.type()==='error'&&/shader|relieve|WebGLProgram/i.test(m.text()))errores.push(m.text())})
 await page.goto('/?sinintro&capture&sinsw')
 await page.waitForFunction(()=>window.lab?.ready)
 const inicial=await page.evaluate(()=>window.lab.hitos.userData.rangos.map(r=>r.id))
 expect(inicial).toContain('rotunda')
 expect(inicial).toContain('solar-rotunda')
 expect(inicial).not.toContain('concordia')
 await page.evaluate(()=>window.lab.lineaDeTiempo.elegir(6))
 await page.waitForFunction(()=>window.lab.hitosSilencio)
 expect(await page.evaluate(()=>window.lab.hitosSilencio.userData.rangos.map(r=>r.id))).toContain('concordia')
 await page.evaluate(()=>{const l=window.lab;l.levantar(true);l.cam.jump({x:-186.6,z:819.5,dist:180,yaw:-.6,pitch:.85});l.cam.update(0);l.renderer.render(l.scene,l.camera)})
 expect(errores).toEqual([])
})
