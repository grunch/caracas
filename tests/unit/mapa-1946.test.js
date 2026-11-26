import {it,expect} from 'vitest'
import {retirarMonte1946} from '../../src/monte-1946.js'
import {crearCoords} from '../../src/coords.js'
import {GLSL_VALLE} from '../../src/shader/valle.js'
import {conElSilencio} from '../../src/el-silencio-epoca.js'
it('1946 sustituye la vista1945 y conserva el año histórico en la ficha del edificio',()=>{
 const e=conElSilencio([1578,1772,1843,1889,1911,1936].map(año=>({año})))
 expect(e.map(x=>x.año)).toEqual([1578,1772,1843,1889,1911,1936,1946])
 expect(e[6].fuente).toContain('WCWdb_18051');expect(e[6].parcial).toBeUndefined()
})
it('recorta árboles bajo casas nuevas sólo desde1946, conserva jardines y vidas anteriores',()=>{
 const atributo={array:new Float32Array([0,0,1,1,0,0,2,1,0,4,3,1])}
 const matrices=new Float32Array(48);matrices[12]=.5;matrices[14]=.5;matrices[28]=1.5;matrices[30]=.5;matrices[44]=2.5;matrices[46]=.5
 const g={userData:{grupos:[{cerca:{count:3,instanceMatrix:{array:matrices},geometry:{getAttribute:()=>atributo}}}]}}
 const plano={ancho:3,alto:1,metro:1,plaza:[0,0]},m={data:new Uint8Array([0,0,0,128,0,0,0,64,0,0,0,128]),width:3,height:1}
 expect(retirarMonte1946(g,m,crearCoords(plano),plano)).toBe(1)
 expect(Array.from(atributo.array).filter((_,i)=>i%4===1)).toEqual([6,0,4])
 expect(atributo.needsUpdate).toBe(true)
})
it('el suelo no añade samplers y mantiene inactivo el alfa de ampliación antes de1946',()=>{
 expect(GLSL_VALLE).not.toMatch(/uniform\s+sampler2D/)
 expect(GLSL_VALLE).toContain('if(e<=5.5)return vec3(0.0)')
})
