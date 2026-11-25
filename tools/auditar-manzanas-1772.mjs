// Comparación de las seis épocas usando los mismos paquetes que carga el visor.
import {readFileSync,writeFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {decodificarPak} from '../src/pak.js'
import {suprimirTechos,zonasDeSupresion} from '../src/hitos/suprimir.js'
import {hitosConPlanta} from '../src/hitos/plantas.js'
const [antes,despues,salida,anioPermitido='1772']=process.argv.slice(2)
if(!['1772','1843','1889'].includes(anioPermitido))throw new Error('Época permitida: 1772, 1843 o 1889')
if(!antes||!despues||!salida)throw new Error('Uso: node tools/auditar-manzanas-1772.mjs carpeta-datos-antes carpeta-datos-despues informe.json [1772|1843|1889]')
const tipos={vertices:Float32Array,techos:Uint32Array,vida:Uint32Array,historia:Uint8Array,marcos:Float32Array,alas:Float32Array,vuelos:Uint8Array,paletas:Uint8Array}
// Las partes opcionales faltan como en el visor (src/ciudad.js): sin marcos ni alas, historia de ceros, sin tope de vuelo.
const leer=dir=>{const b=gunzipSync(readFileSync(dir+'/ciudad.pak')),p=decodificarPak(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),tipos,()=>{}),n=p.techos.length/4
 return{...p,marcos:p.marcos??new Float32Array(0),alas:p.alas??new Float32Array(0),historia:p.historia??new Uint8Array(n*6),vuelos:p.vuelos??new Uint8Array(n).fill(255)}}
const hash=a=>createHash('sha256').update(a.sort().join('\n')).digest('hex')
const registrosCasas=(p,e,suprimir=true)=>{
 const vida=suprimir?suprimirTechos(p,zonasDeSupresion(hitosConPlanta())):(p.vida??new Uint32Array(p.techos.length/4)),marcos=new Map();for(let i=0;i<p.marcos.length;i+=11)marcos.set(p.marcos[i],Array.from(p.marcos.slice(i,i+11)))
 const r=[];for(let i=0;i<p.techos.length/4;i++){const v=vida[i];if(v%8>e||(v>>3)>0&&e>=(v>>3))continue
  const t=Array.from(p.techos.slice(i*4,i*4+4)),m=marcos.get(i),h=Array.from(p.vertices.slice(t[0]*2,(t[0]+t[1])*2));
  r.push(JSON.stringify([h,t[3],p.historia[i*6+e],p.vuelos[i],p.paletas?.[i]??0,m?.slice(1,9),m?Array.from(p.alas.slice(m[9]*5,(m[9]+m[10])*5)):[]]))
 }return r
}
const casas=(p,e)=>{const r=registrosCasas(p,e);return{cantidad:r.length,sha256:hash(r)}}
const arboles=(dir,e)=>{const b=readFileSync(dir+'/arboles.bin'),r=[];for(let i=0;i<b.length;i+=8){const v=b.readUInt16LE(i+6),n=v&7,m=(v>>3)&7;if(n>e||m&&e>=m)continue;r.push(JSON.stringify([b.readUInt16LE(i),b.readUInt16LE(i+2),b.readUInt16LE(i+4),v>>6]))}return{cantidad:r.length,sha256:hash(r)}}
const a=leer(antes),b=leer(despues),epocas=[1578,1772,1843,1889,1911,1936].map((anio,e)=>({anio,antes:casas(a,e),despues:casas(b,e),arbolesAntes:arboles(antes,e),arbolesDespues:arboles(despues,e)}))
const destino=[1578,1772,1843,1889,1911,1936].indexOf(Number(anioPermitido)),origen=destino-1
const visibles=new Set(registrosCasas(b,destino)),heredadas=registrosCasas(a,origen)
const conservadas=new Set(registrosCasas(b,destino,false)),registrosAnteriores=registrosCasas(a,origen,false)
const continuidad=destino>=2?{epocaAnterior:origen===1?1772:1843,registrosAnteriores:registrosAnteriores.length,registrosConservados:registrosAnteriores.filter(c=>conservadas.has(c)).length,casasAnteriores:heredadas.length,conservadasEnDatos:heredadas.filter(c=>conservadas.has(c)).length,visibles:heredadas.filter(c=>visibles.has(c)).length}:undefined
const informe={continuidad,alcance:'Conteos y firmas de huellas, marcos, alas, vuelos, estilos, pisos, paletas y árboles visibles. No sustituye las puertas R1–R12: reglas_mapa.py todavía no existe.',epocas}
writeFileSync(salida,JSON.stringify(informe,null,2)+'\n');console.log(epocas.map(e=>`${e.anio}: ${e.antes.cantidad} → ${e.despues.cantidad} casas; otras propiedades ${e.antes.sha256===e.despues.sha256?'idénticas':'cambiadas'}; árboles ${e.arbolesAntes.sha256===e.arbolesDespues.sha256?'idénticos':'cambiados'}`).join('\n'))
if(epocas.some(e=>e.anio!==Number(anioPermitido)&&(e.antes.sha256!==e.despues.sha256||e.arbolesAntes.sha256!==e.arbolesDespues.sha256)))process.exitCode=1

if(continuidad&&(continuidad.casasAnteriores!==continuidad.conservadasEnDatos||continuidad.registrosAnteriores!==continuidad.registrosConservados))process.exitCode=1
