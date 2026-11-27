/** Devuelve huellas planas y por fase con la vida que les corresponde. */
export function poligonosConVida(hito,propiedad){
 const base=(hito[propiedad]??[]).map(poligono=>({poligono,desde:hito.nace??0,hasta:hito.muere??0}))
 const fases=(hito[`${propiedad}PorEpoca`]??[]).flatMap(f=>{
  const {nace,muere}=f,poligono=f.poligono
  return poligono?[{poligono,desde:nace??hito.nace??0,hasta:muere??hito.muere??0}]:[]
 })
 return [...base,...fases]
}

