import {puntoEnPoligono,vidaSinHito} from './suprimir.js'
import {poligonosConVida} from './datos/fases-geometricas.js'

/** Reservas explícitas de edificios cerrados. Conserva los árboles de las épocas anteriores,
 * las posiciones/semillas y los datos del paquete; no aplica esta regla a jardines de otros hitos. */
export function suprimirArbolesDeHitos(datos,hitos){
  const zonas=hitos.flatMap(h=>poligonosConVida(h,'sinArboles').map(({poligono,desde,hasta})=>({poligono,desde,hasta,
    x0:Math.min(...poligono.map(p=>p[0])),x1:Math.max(...poligono.map(p=>p[0])),
    y0:Math.min(...poligono.map(p=>p[1])),y1:Math.max(...poligono.map(p=>p[1]))})))
  if(!zonas.length)return datos
  const nace=Uint16Array.from(datos.nace),muere=Uint16Array.from(datos.muere)
  for(let i=0;i<datos.n;i++)for(const z of zonas){
    const x=datos.x[i],y=datos.y[i]
    if(x<z.x0||x>z.x1||y<z.y0||y>z.y1||!puntoEnPoligono([x,y],z.poligono))continue
    const vida=vidaSinHito(nace[i]+8*muere[i],z.desde,z.hasta)
    nace[i]=vida%8;muere[i]=Math.floor(vida/8)
  }
  return {...datos,nace,muere}
}
