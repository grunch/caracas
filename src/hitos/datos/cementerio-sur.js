const marco={x:7100,y:12500,eje:[1,0]}
const pixel=([x,z])=>[marco.x+2*x,marco.y+2*z]

// El recinto dibujado en DCN1936, digitalización aproximada; no es deslinde catastral.
export const CONTORNO_SUR_1936=[[-381,-116],[-339,-155],[-282,-185],[-211,-205],[-119,-211],[0,-202],[94,-191],[160,-178],[238,-160],[310,-135],[360,-103],[387,-62],[389,-12],[374,40],[386,90],[409,131],[365,168],[306,198],[243,216],[165,214],[113,194],[48,171],[-20,155],[-89,148],[-159,140],[-229,130],[-296,118],[-355,101],[-404,78],[-433,63],[-424,11],[-410,-37],[-398,-79]].map(pixel)

// Núcleo esquemático para 1889/1911: cuatro cuarteles y dos avenidas de 4 m.
// El texto no fija sus ejes; se cruzan para sugerir cuatro cuarteles, sin atribuir el calce a esos planos.
export const CONTORNO_SUR_INICIAL=[[-108,-74],[-82,-89],[-30,-92],[26,-88],[80,-79],[107,-61],[109,-20],[106,24],[96,61],[65,82],[13,91],[-40,87],[-83,79],[-106,52],[-110,12]].map(pixel)

export const AVENIDAS_SUR_INICIALES=[[[-108,0],[109,0]],[[0,-92],[0,91]]].map(tramo=>tramo.map(pixel))

export const CALLES_SUR_1936=[
 [[194,550],[812,482]],
 ...[[322,367,338,614],[422,352,430,635],[523,360,538,650],[625,372,649,675],[728,397,751,665]].map(([x0,y0,x1,y1])=>[[x0,y0],[x1,y1]]),
 ...[[423,290,788],[474,235,817],[525,206,815],[582,193,817],[628,271,800]].map(([y,x0,x1])=>[[x0,y],[x1,y-8]]),
].map(tramo=>tramo.map(([x,y])=>pixel([1.25*x-650,1.25*y-650])))

const poligonoInicial=CONTORNO_SUR_INICIAL
const poligono1936=CONTORNO_SUR_1936
export const cementerioSur=Object.freeze({
 id:'cementerio-sur',nombre:'Cementerio General del Sur',...marco,nace:3,muere:0,
 planta:[],suprime:[],sinArboles:[],
 plantaPorEpoca:[{nace:3,muere:5,poligonos:[poligonoInicial]},{nace:5,muere:0,poligonos:[poligono1936]}],
 suprimePorEpoca:[{nace:3,muere:5,poligono:poligonoInicial},{nace:5,muere:0,poligono:poligono1936}],
 sinArbolesPorEpoca:[{nace:3,muere:5,poligono:poligonoInicial},{nace:5,muere:0,poligono:poligono1936}],
 sueloPropioPorEpoca:[{nace:3,muere:5,poligono:poligonoInicial},{nace:5,muere:0,poligono:poligono1936}],
 fuente:'DCN 1936; Rodríguez 2011: https://servicio.bc.uc.edu.ve/postgrado/manongo36/art07.pdf',verificar:[],
 partes:[{tipo:'cementerio-sur',fase:'inicial',nace:3,muere:5},{tipo:'cementerio-sur',fase:'ampliado',nace:5,muere:0}],
})
