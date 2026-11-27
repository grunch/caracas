import {test,expect} from '@playwright/test'

test.use({viewport:{width:400,height:300}})

test('el General del Sur conserva sus dos fases y no aparece antes de 1889',async({page})=>{
 const errores=[]
 page.on('pageerror',e=>errores.push(e.message))
 page.on('console',m=>{if(m.type()==='error'&&/shader|relieve|WebGLProgram/i.test(m.text()))errores.push(m.text())})
 await page.goto('/?sinintro&capture&sinsw');await page.waitForFunction(()=>window.lab?.ready)
 const rango=await page.evaluate(()=>window.lab.hitos.userData.rangos.find(r=>r.id==='cementerio-sur'))
 expect(rango).toBeTruthy()
 for(const epoca of [1,2,3,4,5,6]){
  await page.evaluate(e=>window.lab.lineaDeTiempo.elegir(e),epoca)
  await page.waitForFunction(e=>Math.round(window.lab.ciudad.U.uEpocaA.value)===e,epoca)
  await page.evaluate(()=>{const l=window.lab;l.levantar(true);l.renderer.render(l.scene,l.camera)})
 }
 const conteo=await page.evaluate(()=>{
  const g=window.lab.hitos.geometry,r=window.lab.hitos.userData.rangos.find(x=>x.id==='cementerio-sur'),vida=g.getAttribute('aVida'),porFase=new Set()
  for(let i=r.desde;i<r.hasta;i+=Math.max(1,Math.floor((r.hasta-r.desde)/250))){porFase.add(`${vida.getX(i)}/${vida.getY(i)}`)}
  return [...porFase]
 })
 expect(conteo).toContain('3/5');expect(conteo).toContain('5/0');expect(errores).toEqual([])
})
