/** Continúa el tejido generado de la época anterior y añade únicamente sus ampliaciones. */
export const integrarManzanas1843=(datos,manzanas)=>integrarManzanasEpoca(datos,manzanas,2)
export function integrarManzanasEpoca(datos,manzanas,epoca){
 if(![2,3].includes(epoca))throw new Error("Época de ampliación no soportada")
 const ciudad={...datos,vertices:[...datos.vertices],techos:[],vida:[],historia:[],paletas:[],vuelos:[],marcos:[],alas:(datos.alas??[]).map(a=>[...a])}
 const marcos=new Map((datos.marcos??[]).map(m=>[m[0],m]))
 const informe={casasHeredadas:0,casasSustituidas:0,casasNuevas:0,manzanas:[]}
 function copiar(i,vida,heredada=false){
  const n=ciudad.techos.length,h=[...datos.historia[i]];if(heredada)h[epoca]=h[epoca-1]
  ciudad.techos.push([...datos.techos[i]]);ciudad.vida.push(vida);ciudad.historia.push(h)
  ciudad.paletas.push(datos.paletas?.[i]??0);ciudad.vuelos.push(datos.vuelos?.[i]??255)
  if(marcos.has(i))ciudad.marcos.push([n,...marcos.get(i).slice(1)])
 }
 datos.vida.forEach(([n,f],i)=>{
  // Se copian los registros exactos de las generaciones anteriores, sin volver a sortearlas.
  if(datos.paletas?.[i]>0&&n>=1&&n<epoca&&f===epoca){copiar(i,[n,epoca+1],true);informe.casasHeredadas++;return}
  if(n>epoca||f&&f<=epoca){copiar(i,[n,f]);return}
  informe.casasSustituidas++
  if(n<epoca)copiar(i,[n,epoca])
  if(!f||f>epoca+1)copiar(i,[epoca+1,f])
 })
 if(!informe.casasHeredadas)throw new Error('Faltan las manzanas generadas de la época anterior')
 for(const m of manzanas){
  for(const c of m.casas){
   const n=ciudad.techos.length,inicio=ciudad.vertices.length/2
   ciudad.vertices.push(...c.huella.flat());ciudad.techos.push([inicio,c.huella.length,c.pisos,0,c.semilla])
   ciudad.vida.push([epoca,epoca+1]);ciudad.historia.push(Array(6).fill(c.pisos*16));ciudad.paletas.push(c.paleta);ciudad.vuelos.push(0)
   ciudad.marcos.push([n,...c.marco,ciudad.alas.length,c.alas.length]);ciudad.alas.push(...c.alas)
  }
  const {casas,...resumen}=m
  informe.manzanas.push({...resumen,estado:'integrada',nuevas:casas.length});informe.casasNuevas+=casas.length
 }
 return {ciudad,informe}
}
