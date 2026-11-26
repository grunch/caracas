/** Quita desde1946 los árboles anteriores cuyo centro cae bajo una casa nueva.
 * El canal alfa de crece1946 marca192 urbano,128 techo,64 jardín,255 fuera.
 * Modifica sólo el final de vida; las matrices y todas las épocas anteriores permanecen iguales.
 */
export function retirarMonte1946(grupo, {data,width,height}, coords, plano) {
  let n=0
  for(const g of grupo?.userData.grupos??[]){
    const m=g.cerca,atributo=m.geometry.getAttribute('aArbol'),matrices=m.instanceMatrix.array
    for(let i=0;i<m.count;i++){
      const {px,py}=coords.aPixel(matrices[i*16+12],matrices[i*16+14])
      const x=Math.floor(px/plano.ancho*width),y=Math.floor(py/plano.alto*height)
      if(x<0||y<0||x>=width||y>=height)continue
      const a=data[(y*width+x)*4+3],fin=atributo.array[i*4+1]
      if(a>=100&&a<=155&&(!fin||fin>6)){atributo.array[i*4+1]=6;n++}
    }
    atributo.needsUpdate=true
  }
  return n
}
