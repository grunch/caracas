import {test,expect} from '@playwright/test'

test('El Silencio aparece en1946, conserva1936 y abre el plano base correcto',async({page},info)=>{
 const errores=[];page.on('pageerror',e=>errores.push(e.message));await page.goto('/?capture&sinintro');await page.waitForFunction(()=>window.lab?.ready&&lab.lineaDeTiempo)
 await expect(page.getByRole('button',{name:'1946',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'1946',exact:true}).click();await expect(page.locator('#epocas')).toContainText('plano de 1946')
 await expect(page.getByRole('button',{name:'Ver el plano de 1946',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Ver el plano de 1946',exact:true}).click()
 await expect(page.locator('#visor-plano')).toBeVisible()
 await expect(page.locator('#visor-plano')).toContainText('1946')
 await page.getByRole('button',{name:'Cerrar el plano',exact:true}).click()
 await page.waitForFunction(()=>lab.hitosSilencio&&lab.ciudad.U.uEpocaA.value===6)
 const r=await page.evaluate(async()=>{
  const {Mesh,Scene,OrthographicCamera,Color}=await import('/node_modules/three/build/three.module.js')
  const {hitosSilencio:hitos,renderer,ciudad:{U},coords}=lab,g=hitos.geometry.clone(),rangos=hitos.userData.rangos.filter(r=>r.id.startsWith('silencio-'))
  const desde=rangos[0].desde,idx=g.index.array;let i=0;while(idx[i]<desde)i++;g.setDrawRange(i,idx.length-i)
  const escena=new Scene();escena.background=new Color(0xcccccc);const m=new Mesh(g,hitos.material);m.frustumCulled=false;escena.add(m)
  const c=coords.aMundo(7900,7400),cam=new OrthographicCamera(-270,270,270,-270,.1,5000);cam.position.set(c.x,2400,c.z+.1);cam.lookAt(c.x,0,c.z)
  U.uOla.value=1e5;U.uColor.value=1;U.uOlaEpoca.value=9000
  const contar=e=>{U.uEpocaDe.value=U.uEpocaA.value=e;renderer.render(escena,cam);const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);let n=0;for(let k=0;k<px.length;k+=4)if(Math.abs(px[k]-204)+Math.abs(px[k+1]-204)+Math.abs(px[k+2]-204)>12)n++;return n}
  const antes=contar(5),despues=contar(6),volver=contar(5);g.dispose();return {antes,despues,volver,rangos:rangos.length}
 })
 expect(r.antes).toBe(0);expect(r.volver).toBe(0);expect(r.despues).toBeGreaterThan(500);expect(r.rangos).toBe(10);expect(errores).toEqual([])
 await info.attach('visibilidad-el-silencio',{body:JSON.stringify(r),contentType:'application/json'})
})

test('si falla el worker de1946 se puede reintentar sin bloquear la línea de tiempo',async({page})=>{
 await page.addInitScript(()=>{const Original=window.Worker;let fallo=false;window.Worker=class extends Original{postMessage(m,...args){if(m.soloSilencio&&!fallo){fallo=true;setTimeout(()=>this.onmessage?.({data:{error:'fallo de prueba'}}),0);return}super.postMessage(m,...args)}}})
 await page.goto('/?capture&sinintro');await page.waitForFunction(()=>window.lab?.ready&&lab.lineaDeTiempo)
 await page.getByRole('button',{name:'1946',exact:true}).click()
 await expect(page.locator('#epocas .pie')).toContainText('Puedes volver a elegirla')
 await page.getByRole('button',{name:'1946',exact:true}).click()
 await page.waitForFunction(()=>lab.hitosSilencio&&lab.ciudad.U.uEpocaA.value===6)
})

test('sin índice de épocas se conserva1936, sin un vacío de El Silencio',async({page})=>{
 await page.route('**/datos/crece.json',r=>r.fulfill({status:404,body:'no disponible'}))
 await page.goto('/?capture&sinintro');await page.waitForFunction(()=>window.lab?.ready&&lab.ciudad.U.uEpocaA.value===5)
 expect(await page.evaluate(()=>lab.hitosSilencio)).toBeNull()
})
