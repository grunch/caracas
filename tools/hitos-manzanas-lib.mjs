/**
 * Ningún hito va sobre una manzana (specs/13, R13): el chico entra en ella y el grande la retira entera. La medida
 * y la decisión son de tools/geo/hitos_manzanas.py; acá, lo que el pipeline hace con ellas. Lógica pura, sin efectos.
 */
import {puntoEnPoligono} from '../src/hitos/suprimir.js'

/** Lo que la medición necesita de cada manzana: su contorno, sin casas ni árboles. */
export const paraMedir=manzanas=>manzanas.map(({id,poligono,limite,huecos})=>({id,poligono,...(limite?{limite}:{}),...(huecos?{huecos}:{})}))

const sinCasas=({casas,...m})=>m
/**
 * Las manzanas que quedan (tal cual) y el registro de las retiradas, según las decisiones (una por manzana, en orden).
 * El registro guarda la manzana entera (sin sus casas): cuando el hito ya no esté, vuelve (`devolverManzanas`).
 */
export function separarRetiradas(manzanas,decisiones,epoca){
 if(decisiones.length!==manzanas.length)throw new Error(`Hitos y manzanas: ${decisiones.length} decisiones para ${manzanas.length} manzanas`)
 const quedan=[],retiradas=[]
 manzanas.forEach((m,i)=>{
  const d=decisiones[i]
  if(d.id!==m.id)throw new Error(`Hitos y manzanas: la decisión ${d.id} no es de la manzana ${m.id}`)
  if(!d.retirar){quedan.push(m);return}
  retiradas.push({id:m.id,poligono:m.poligono,...(m.limite?{limite:m.limite}:{}),huecos:m.huecos??[],areaM2:m.areaDespuesM2??m.areaM2,epoca,
   ocupacion:d.ocupacion,motivo:d.motivo,hitos:d.hitos.map(h=>h.hito),manzana:sinCasas(m)})
 })
 return {quedan,retiradas}
}

/** La manzana de un registro de retirada; de uno viejo, que no la guardaba, su contorno y su área. */
const manzanaDeRetirada=({manzana,id,poligono,limite,huecos,areaM2})=>manzana??{id,poligono,...(limite?{limite}:{}),huecos:huecos??[],areaM2}

/**
 * La regla retira la manzana «en las épocas en que el hito está en pie» (specs/13, R13): las retiradas de la época
 * anterior se miden otra vez (una decisión por registro, en orden). Las que un hito sigue retirando `siguen`
 * retiradas; las demás `vuelven` como manzanas: el suelo de manzana, sin casas ni árboles generados, porque nada dice
 * qué se levantó en el solar cuando el hito dejó de estar.
 */
export function devolverManzanas(registros,decisiones,epoca){
 const {quedan,retiradas}=separarRetiradas(registros.map(manzanaDeRetirada),decisiones,epoca)
 const registro=new Map(registros.map(r=>[r.id,r]))
 const vuelven=quedan.map(m=>({...m,arboles:[],arbolesObjetivo:0,cantidadCasas:0,nuevas:0,estado:'devuelta',
  devuelta:{epoca,retiradaHasta:registro.get(m.id).epoca,hitos:registro.get(m.id).hitos}}))
 return {siguen:retiradas,vuelven}
}

/**
 * Lo que ya está ocupado al ampliar la ciudad en una época: las manzanas heredadas que quedan, las que un hito retira
 * ahora, las que retiró en épocas anteriores y sigue retirando, y las que vuelven porque su hito ya no está. Sobre ese
 * suelo el plano de la época no levanta otra manzana: si no, la cuadra del hito volvería con otro nombre y con casas
 * pegadas a él, o encima de la que vuelve.
 */
export const ocupadasParaAmpliar=({quedan,retiradas},previas=[],devueltas=[])=>paraMedir([...quedan,...retiradas,...previas,...devueltas])

const CERCA_DEL_CENTRO=.1 // cada vértice se prueba corrido hacia el centro: la casa recortada comparte el borde de su manzana
const enZona=(p,z)=>puntoEnPoligono(p,z.limite??z.poligono)&&!(z.huecos??[]).some(h=>puntoEnPoligono(p,h))
/** ¿Cae la mayor parte de la huella en alguna de las zonas (manzanas con su límite y sus huecos)? */
export function casaEnZonas(huella,zonas){
 if(!zonas.length)return false
 const centro=[0,1].map(k=>huella.reduce((s,v)=>s+v[k],0)/huella.length)
 const puntos=[centro,...huella.map(v=>[0,1].map(k=>v[k]+(centro[k]-v[k])*CERCA_DEL_CENTRO))]
 return zonas.some(z=>puntos.filter(p=>enZona(p,z)).length*2>puntos.length)
}

/** Las manzanas retiradas como zonas de arbolado vacías: lo que crecía en ellas no pasa a la época. */
export const zonasSinArboles=retiradas=>retiradas.map(m=>({...m,arboles:[]}))

/**
 * Las zonas donde el arbolado de la época es el del generador: las manzanas con sus árboles y las retiradas, vacías.
 * Una manzana devuelta no es zona: no tiene árboles generados y conserva los que el plano dibuja en el solar.
 */
export const zonasDeArbolado=(manzanas,retiradas)=>[...manzanas.filter(m=>m.estado!=='devuelta'),...zonasSinArboles(retiradas)]

/** { hito: [manzanas que tenía retiradas y vuelven] } */
export function resumenDeDevueltas(devueltas){
 const porHito={}
 for(const m of devueltas)for(const h of m.devuelta.hitos)porHito[h]=[...(porHito[h]??[]),m.id]
 return porHito
}

/** { hito: [manzanas que retira] } */
export function resumenDeRetiradas(retiradas){
 const porHito={}
 for(const m of retiradas)for(const h of m.hitos)porHito[h]=[...(porHito[h]??[]),m.id]
 return porHito
}

const miles=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')
const pct=f=>`${Math.round(f*100)} %`
/** La tabla hito × época × manzana de docs/manzanas-hitos.md. */
export function tablaMd(filas){
 const orden=[...filas].sort((a,b)=>a.epoca-b.epoca||a.hito.localeCompare(b.hito)||a.manzana.localeCompare(b.manzana))
 return ['| Época | Hito | Manzana | Manzana m² | Huella m² | Recinto m² | Manzana bajo la huella | Manzana bajo el recinto | Huella en la manzana | Recinto en la manzana | Ocupación de todos los hitos | Clase | Decisión |',
  '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|',
  ...orden.map(f=>`| ${f.año} | ${f.hito} | ${f.manzana} | ${miles(f.areaManzanaM2)} | ${miles(f.areaHuellaM2)} | ${miles(f.areaRecintoM2)} | ${pct(f.manzanaBajoHuella)} | ${pct(f.manzanaBajoRecinto)} | ${pct(f.huellaEnManzana)} | ${pct(f.recintoEnManzana)} | ${pct(f.ocupacionManzana)} | ${f.clase} | ${f.decision==='retirar'?'**retirar**':'conservar'} |`)].join('\n')
}
