import {hijosDios} from './datos/hijos-dios.js'
import {cementerioSur} from './datos/cementerio-sur.js'
import {puentesGuaire} from './datos/puentes-guaire.js'
import {poligonosConVida} from './datos/fases-geometricas.js'
// El terreno grueso (96m en software) puede pasar por encima del pavimento
// fino aunque ambos consulten el mismo DEM. Se oculta solo dentro del recinto
// cuando el hito está totalmente levantado y existe en la época de ese punto.
export function glslSuelosPropios(plano,metro){
 const f=n=>Number(n).toFixed(5),v=p=>`vec2(${p.map(f).join(',')})`
 // Los puentes abren el suelo en su cauce: el lecho lo dibuja el propio puente (src/hitos/puente.js).
 const suelos=[...hijosDios.sueloPropio.map(poligono=>({h:hijosDios,poligono,desde:hijosDios.nace,hasta:hijosDios.muere})),
   ...[cementerioSur,...puentesGuaire].flatMap(h=>poligonosConVida(h,'sueloPropio').map(z=>({h,...z})))]
 const bloques=suelos.map(({h,poligono:poly,desde,hasta})=>{
  const pts=poly.map(([x,y])=>[(x-plano.plaza[0])*metro,(y-plano.plaza[1])*metro])
  const centro=[(h.x-plano.plaza[0])*metro,(h.y-plano.plaza[1])*metro]
  const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1])
  const edges=pts.map((a,i)=>{const b=pts[(i+1)%pts.length];return `{vec2 a=${v(a)},b=${v(b)},d=b-a;
    borde=min(borde,length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.0,1.0)));
    if ((a.y>p.y)!=(b.y>p.y)) {if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) dentro=!dentro;}}`}).join('\n')
  return `if(p.x>${f(Math.min(...xs))}&&p.x<${f(Math.max(...xs))}&&p.y>${f(Math.min(...zs))}&&p.y<${f(Math.max(...zs))}
    &&vivoEn(vec2(${f(desde)},${f(hasta)}),epocaAqui(length(p)))>0.5
    &&smoothstep(0.0,1.0,(uOla-${f(Math.hypot(...centro))}-60.0)/uAnchoOla)>0.99){
    bool dentro=false;float borde=1e6;${edges}
    if(dentro&&borde>0.4)return true;}`
 })
 return `bool bajoSueloPropio(vec2 p){${bloques.join('\n')}return false;}`
}
