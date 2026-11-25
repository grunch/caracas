/** Continúa el tejido aprobado de 1772 y añade únicamente las nuevas manzanas de 1843. */
export function integrarManzanas1843(datos,manzanas){
 const ciudad={...datos,vertices:[...datos.vertices],techos:[],vida:[],historia:[],paletas:[],vuelos:[],marcos:[],alas:(datos.alas??[]).map(a=>[...a])}
 const marcos=new Map((datos.marcos??[]).map(m=>[m[0],m]))
 const informe={casasHeredadas:0,casasSustituidas:0,casasNuevas:0,manzanas:[]}
 function copiar(i,vida,heredada=false){
  const n=ciudad.techos.length,h=[...datos.historia[i]];if(heredada)h[2]=h[1]
  ciudad.techos.push([...datos.techos[i]]);ciudad.vida.push(vida);ciudad.historia.push(h)
  ciudad.paletas.push(datos.paletas?.[i]??0);ciudad.vuelos.push(datos.vuelos?.[i]??255)
  if(marcos.has(i))ciudad.marcos.push([n,...marcos.get(i).slice(1)])
 }
 datos.vida.forEach(([n,f],i)=>{
  // Se copian los registros exactos, no se vuelve a sortear una manzana ya construida.
  if(datos.paletas?.[i]>0&&n===1&&f===2){copiar(i,[1,3],true);informe.casasHeredadas++;return}
  if(n>2||f&&f<=2){copiar(i,[n,f]);return}
  informe.casasSustituidas++
  if(n<2)copiar(i,[n,2])
  if(!f||f>3)copiar(i,[3,f])
 })
 if(!informe.casasHeredadas)throw new Error('Faltan las manzanas generadas de 1772: ejecuta primero manzanas-1772')
 for(const m of manzanas){
  for(const c of m.casas){
   const n=ciudad.techos.length,inicio=ciudad.vertices.length/2
   ciudad.vertices.push(...c.huella.flat());ciudad.techos.push([inicio,c.huella.length,c.pisos,0,c.semilla])
   ciudad.vida.push([2,3]);ciudad.historia.push(Array(6).fill(c.pisos*16));ciudad.paletas.push(c.paleta);ciudad.vuelos.push(0)
   ciudad.marcos.push([n,...c.marco,ciudad.alas.length,c.alas.length]);ciudad.alas.push(...c.alas)
  }
  const {casas,...resumen}=m
  informe.manzanas.push({...resumen,estado:'integrada',nuevas:casas.length});informe.casasNuevas+=casas.length
 }
 return {ciudad,informe}
}
