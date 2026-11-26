import {it,expect} from 'vitest'
import {uniformsManzanasModernas,ponerManzanasModernas} from '../../src/suelo-manzanas-modernas.js'
import epocas from '../../src/manzanas/epocas-completas.json'
const meta={caja:[0,0,100,100],ancho:25,alto:25,m_por_px:2,dist_max_m:16,banda_calle_m:12,canales:[1911]}
it('solo activa épocas con código y datos disponibles; no interpreta canales vacíos como jardines',()=>{
 const U=uniformsManzanasModernas(),plano={ancho:200,alto:200}
 expect(U.uManzanasModernasCanales.value.toArray()).toEqual([0,0,0])
 ponerManzanasModernas(U,meta,{},plano)
 expect(U.uManzanasModernasCanales.value.toArray()).toEqual([1,0,0])
 ponerManzanasModernas(U,{...meta,canales:[1911,1936,1946]}, {},plano)
 expect(U.uManzanasModernasCanales.value.toArray()).toEqual([1911,1936,1946].map(a=>+epocas.includes(a)))
 const anterior=U.uManzanasModernas.value
 expect(()=>ponerManzanasModernas(U,{...meta,canales:[1946]}, {},plano)).toThrow(/canales/)
 expect(U.uManzanasModernas.value).toBe(anterior)
})
