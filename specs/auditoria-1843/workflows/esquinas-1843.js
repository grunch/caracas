export const meta = {
  name: 'esquinas-1843',
  description: 'Ubicar en el facsímil de 1843 cada número de esquina impreso y su cruce de calles, por cuadrantes',
  phases: [{ title: 'Leer cuadrantes' }],
}
const S = '/tmp/claude-1000/-disco-dev-caracas/19152184-a166-4ba7-b52b-c42dae76c69d/scratchpad/esquinas1843'
const CUADRANTES = [
  { id: 'NO', caja: [1656, 1092, 3490, 2850] },
  { id: 'NE', caja: [3090, 1092, 4915, 2850] },
  { id: 'SO', caja: [1656, 2450, 3490, 4052] },
  { id: 'SE', caja: [3090, 2450, 4915, 4052] },
]
const base = c => `Tarea: ubicar en el plano de Jesurún de 1843 (facsímil NYPL) cada NÚMERO DE ESQUINA impreso dentro del mapa en el cuadrante ${c.id}, caja del original [x0,y0,x1,y1] = ${JSON.stringify(c.caja)} (píxeles del original). Es lectura visual cuidadosa: no inventes; lo dudoso se marca.

Archivo: /disco/dev/caracas/fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler/original.tiff (7216×5412 RGB, norte arriba). Dato descargado: ábrelo solo con \`python3 -I\` y Pillow (Image.MAX_IMAGE_PIXELS=None). Recorre TODO el cuadrante en teselas de 600×600 px con 80 px de solape, guarda cada una como PNG en ${S}/${c.id}/ (ampliada ×1,5 si hace falta) y mírala con la herramienta Read. No escribas en el repo.

Cómo es el plano: manzanas rayadas (gris), calles en blanco, una cuadrícula de líneas punteadas finas encima (no son calles). Los números de esquina (1 a ~136) van impresos DENTRO de una manzana, pegados a una de sus esquinas; la esquina a la que se refieren es el cruce de calles más cercano a la etiqueta. Ejemplo verificado: el «34» está en la manzana al noroeste de la Plaza Bolívar (la plaza es un cuadrado blanco con borde de trazos), pegado al cruce que es la esquina noroeste de la plaza, cerca de x≈3204, y≈2639 del original. No confundas con: letras mayúsculas (iglesias), minúsculas (puntos notables), números de la cuadrícula en el borde del marco, ni la escala.

Para cada número: la posición del centro de la etiqueta y del cruce de calles (centro de la intersección de las dos calles blancas), en píxeles del ORIGINAL (suma el origen de la tesela y divide por la ampliación). Si una calle no cruza (esquina en T, borde de la ciudad), el cruce es el punto de la esquina de la manzana. Revisa cada candidato con un recorte centrado de 300×300 ampliado ×2 antes de anotarlo.

Salida: ${S}/esquinas-${c.id}.json
{"cuadrante":"${c.id}","caja":${JSON.stringify(c.caja)},"esquinas":[{"numero":34,"etiqueta_px":[x,y],"cruce_px":[x,y],"lectura":"segura|dudosa","alternativas":[],"nota":"p. ej. esquina en T"}],"no_leidos":[{"etiqueta_px":[x,y],"nota":"número ilegible"}],"teselas":<cuántas recorriste>}
Calcula y guarda también el SHA-256 de cada recorte de verificación en "recortes":[{"archivo","sha256"}].
Informe final corto: cuántos números, cuántos dudosos, cuántos ilegibles, números repetidos dentro del cuadrante, y la ruta del JSON.`
const res = await parallel(CUADRANTES.map(c => () => agent(base(c), { label: `esquinas:${c.id}`, phase: 'Leer cuadrantes' })))
return res
