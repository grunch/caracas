import {test,expect} from '@playwright/test'
import epocas from '../../src/manzanas/epocas-completas.json' with {type:'json'}
test('el plano automático de 1946 no tiñe el verde de los solares en modo color',async({page})=>{
 test.setTimeout(180000)
 test.skip(!epocas.includes(1946),'1946 todavía no usa el modelo completo')
 const r=await page.request.get('/datos/suelo-manzanas-modernas.json')
 test.skip(!r.ok()||!(r.headers()['content-type']??'').includes('json'),'Paquete sin suelo moderno')
 test.skip(!(await r.json()).canales.includes(1946),'Paquete anterior a 1946')
 await page.goto('/?sinintro&sinsw')
 await page.waitForFunction(()=>window.lab?.ready&&lab.casasListas&&lab.lineaDeTiempo)
 await page.evaluate(()=>lab.lineaDeTiempo.elegir(6))
 await page.waitForFunction(()=>lab.ciudad.U.uEpocaA.value===6&&lab.ciudad.U.uOlaEpoca.value>=9000&&lab.ciudad.U.uManzanasModernasCanales.value.z===1&&lab.ciudad.U.uPlanoA.value.image?.width>1)
 const diferencia=await page.evaluate(async()=>{
  const {OrthographicCamera,WebGLRenderTarget}=await import('/node_modules/three/build/three.module.js')
  const {renderer,scene,coords,ciudad:{U}}=lab,c=coords.aMundo(9130,7180)
  const cam=new OrthographicCamera(-20,20,20,-20,.1,5000);cam.position.set(c.x,3000,c.z+.1);cam.lookAt(c.x,0,c.z)
  const target=new WebGLRenderTarget(32,32),previo=renderer.getRenderTarget(),rect=U.uPlanoARect.value.clone(),color=U.uColor.value
  U.uColor.value=1;U.uOla.value=1e5;U.uEpocaDe.value=U.uEpocaA.value=6;U.uOlaEpoca.value=9000
  const leer=()=>{const b=new Uint8Array(32*32*4);renderer.setRenderTarget(target);renderer.render(scene,cam);renderer.readRenderTargetPixels(target,0,0,32,32,b);return b}
  try{
   const con=leer();U.uPlanoARect.value.set(2,2,3,3);const sin=leer()
   return Math.max(...con.map((v,i)=>Math.abs(v-sin[i])))
  }finally{U.uPlanoARect.value.copy(rect);U.uColor.value=color;renderer.setRenderTarget(previo);target.dispose()}
 })
 expect(diferencia).toBeLessThanOrEqual(1)
})
