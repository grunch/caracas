import {test,expect} from '@playwright/test'
test.use({viewport:{width:400,height:300}})
test('San Agustín carga y se dibuja en 1936/1946 sin errores de shader',async({page})=>{
 const errores=[];page.on('pageerror',e=>errores.push(e.message))
 page.on('console',m=>{if(m.type()==='error'&&/shader|relieve|WebGLProgram/i.test(m.text()))errores.push(m.text())})
 await page.goto('/?sinintro&capture&sinsw');await page.waitForFunction(()=>window.lab?.ready)
 expect(await page.evaluate(()=>{const r=window.lab.hitos.userData.rangos.find(r=>r.id==='san-agustin');return r?r.hasta-r.desde:0})).toBeGreaterThan(0)
 for(const epoca of [5,6]){
  await page.evaluate(e=>window.lab.lineaDeTiempo.elegir(e),epoca)
  await page.waitForFunction(e=>window.lab.ciudad.U.uEpocaA.value===e,epoca)
  if(epoca===6)await page.waitForFunction(()=>window.lab.hitosSilencio)
  const cambiados=await page.evaluate(e=>{
   const l=window.lab,U=l.ciudad.U;l.levantar(true);U.uOla.value=1e5;U.uEpocaDe.value=U.uEpocaA.value=e;U.uOlaEpoca.value=9000
   l.cam.jump({x:394.5,z:967.1,dist:170,yaw:-.6,pitch:.85});l.cam.update(0)
   const r=l.hitos.userData.rangos.find(r=>r.id==='san-agustin'),vida=l.hitos.geometry.attributes.aVida
   const original=vida.array.slice(r.desde*2,r.hasta*2),gl=l.renderer.getContext()
   const leer=()=>{l.renderer.render(l.scene,l.camera);const p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);return p}
   const conTemplo=leer()
   try{
    for(let i=r.desde;i<r.hasta;i++){vida.array[i*2]=99;vida.array[i*2+1]=0}vida.needsUpdate=true
    const sinTemplo=leer();let n=0;for(let i=0;i<conTemplo.length;i+=4)if(conTemplo[i]!==sinTemplo[i]||conTemplo[i+1]!==sinTemplo[i+1]||conTemplo[i+2]!==sinTemplo[i+2])n++
    return n
   }finally{vida.array.set(original,r.desde*2);vida.needsUpdate=true;l.renderer.render(l.scene,l.camera);U.uOlaEpoca.value=8999;l.pedirCuadro(3)}
  },epoca)
  expect(cambiados).toBeGreaterThan(10)
 }
 expect(errores).toEqual([])
})
