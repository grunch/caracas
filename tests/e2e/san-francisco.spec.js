import { test, expect } from '@playwright/test'

test('San Francisco: portada de 1745 y campanario en 1772 y 1843, fachada de Hurtado Manrique desde 1889, tinta y relieve compartidos', async ({ page }, testInfo) => {
  const errores=[]
  page.on('pageerror',e=>errores.push(e.message))
  page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|GLSL/i.test(m.text()))errores.push(m.text())})
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(()=>window.lab?.ready===true)
  const resultado=await page.evaluate(async()=>{
    const {Scene,Mesh,OrthographicCamera,Color}=await import('/node_modules/three/build/three.module.js')
    const {HITOS}=await import('/src/hitos.js')
    const {hitos,renderer,ciudad:{U},coords}=window.lab
    const h=HITOS.find(h=>h.id==='san-francisco'),r=hitos.userData.rangos.find(r=>r.id===h.id)
    const g=hitos.geometry.clone(),indices=g.index.array
    let desde=0;while(indices[desde]<r.desde)desde++
    let hasta=desde;while(hasta<indices.length&&indices[hasta]<r.hasta)hasta++
    g.setDrawRange(desde,hasta-desde)
    const escena=new Scene();escena.background=new Color(0xcccccc)
    const m=new Mesh(g,hitos.material);m.frustumCulled=false;escena.add(m)
    const origen=coords.aMundo(h.x,h.y),[ex,ez]=h.eje.map(v=>v/Math.hypot(...h.eje))
    const camara=new OrthographicCamera(-34,34,22,-20,.1,600)
    // desde el noroeste (−a, +b): la fachada norte y, a su derecha, el lado del campanario colonial; mira al medio de la nave
    const centro={x:origen.x+ex*24,z:origen.z+ez*24}
    camara.position.set(centro.x-ex*150-ez*150,110,centro.z-ez*150+ex*150)
    camara.lookAt(centro.x,6,centro.z)
    const claves=['uEpocaDe','uEpocaA','uOlaEpoca','uOla','uColor','uExageracion']
    const previos=Object.fromEntries(claves.map(k=>[k,U[k].value])),tomas=[],capturas=[]
    try{
      U.uOla.value=1e5;U.uOlaEpoca.value=9000;U.uExageracion.value=0
      for(const [epoca,color] of [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[5,0]]){
        U.uEpocaDe.value=U.uEpocaA.value=epoca;U.uColor.value=color;renderer.render(escena,camara)
        const gl=renderer.getContext(),p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4)
        gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);tomas.push(p)
        if(epoca>0)capturas.push({epoca,color,png:renderer.domElement.toDataURL('image/png')})
      }
      const diferencias=tomas.slice(1).map((p,j)=>{let n=0;for(let i=0;i<p.length;i+=4)if(Math.abs(p[i]-tomas[j][i])+Math.abs(p[i+1]-tomas[j][i+1])+Math.abs(p[i+2]-tomas[j][i+2])>12)n++;return n})
      return {diferencias,capturas,relieveCompartido:hitos.material.uniforms.tRelieve===U.tRelieve}
    }finally{for(const k of claves)U[k].value=previos[k];g.dispose()}
  })
  expect(resultado.relieveCompartido).toBe(true)
  for(const c of resultado.capturas)await testInfo.attach(`san-francisco-epoca-${c.epoca}-${c.color?'color':'tinta'}`,{body:Buffer.from(c.png.split(',')[1],'base64'),contentType:'image/png'})
  // aparece en 1772, en 1843 llegan los contrafuertes, en 1889 la fachada nueva y pasa a tinta; 1911 y 1936 repiten la de 1889
  const [aparece,a1843,a1889,a1911,a1936,tinta]=resultado.diferencias
  for(const n of [aparece,a1843,a1889,tinta])expect(n,`${resultado.diferencias}`).toBeGreaterThan(100)
  for(const n of [a1911,a1936])expect(n,`${resultado.diferencias}`).toBeLessThan(50)
  expect(errores).toEqual([])
})
