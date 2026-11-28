/** Catálogo y cronología de los puentes del Guaire: del estudio de Miraflores (grunch/miraflores, src/puentes-guaire-datos.js, 046338d). */
export const ANIOS_PUENTES=[1772,1843,1889,1911,1936,1946];
// Del catálogo del estudio acá va solo lo que el constructor usa. Las notas de cada puente, sus fuentes y la vista
// del visor quedan en Miraflores (docs/puentes-guaire/*.md): esto se empaqueta en el worker de los hitos.
export const CATALOGO_PUENTES={
 sucre:{nombre:'Constitución / Sucre',anioVista:1911},
 hierro:{nombre:'Puente de Hierro · Regeneración',anioVista:1889},
 dolores:{nombre:'Puente Dolores',anioVista:1911},
 restaurador:{nombre:'Puente Restaurador',anioVista:1911},
 diciembre:{nombre:'Puente 19 de Diciembre',anioVista:1911},
 ayacucho:{nombre:'Puente Ayacucho',anioVista:1936},
};
export function estadoPuente(id,anio){
 if(!CATALOGO_PUENTES[id]||!ANIOS_PUENTES.includes(anio))throw new RangeError('Puente o época no admitidos');
 let presente=false,modelo=null,fase='Este puente todavía no existe';
 if(id==='sucre'&&anio>=1889){presente=true;modelo=anio===1889?'constitucion':anio===1911?'bowstring':null;fase=anio===1889?'Puente Constitución · estructura anterior':anio===1911?'Puente Sucre · estructura metálica de 1895':'Puente Sucre de concreto · alzado pendiente';}
 if(id==='hierro'&&anio>=1889){presente=true;modelo=anio<1946?'hierro':null;fase=modelo?'Puente de Hierro · estructura anterior a 1937':'Puente sustituto de 1937 · alzado pendiente';}
 if(id==='dolores'&&anio>=1911){presente=anio===1911?true:null;modelo=anio===1911?'dolores':null;fase=modelo?'Puente Dolores · antes de las reformas de 1915':'Estructura de 1911 retirada; estado del cruce por documentar';}
 if(['restaurador','diciembre'].includes(id)&&anio>=1911){presente=anio===1911?true:null;modelo=anio===1911?id:null;fase=modelo?'Estructura documentada hacia 1911':'Reformas posteriores · variante no restituida';}
 if(id==='ayacucho'&&anio>=1936){presente=true;modelo='ayacucho';fase='Puente Ayacucho · posterior a 1924';}
 return {id,anio,presente,modelo,fase};
}
