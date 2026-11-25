export const meta = {
  name: 'investigacion-reglas',
  description: 'F0 de T82: investigar en la web las cifras de las reglas de construcción por época, verificarlas y armar la tabla',
  phases: [{ title: 'Buscar' }, { title: 'Verificar' }, { title: 'Sintetizar' }],
}
// Argumentos: { temas?: [ids de TEMAS] }  (por omisión, todos). Devuelve { temas: [{tema, afirmaciones, veredictos}], tabla }.
// Lo devuelto lo junta Claude en specs/reglas/investigacion.json y en la tabla de specs/13 § 3.
const EPOCAS = '1578, 1772, 1843, 1889, 1911 y 1936'
const TEMAS = [
  { id: 'solares', q: `La traza fundacional de Caracas (fundación de 1567, plano de Juan de Pimentel de 1578) y su manzana: medida de la cuadra en varas y metros, cuántos solares por manzana (¿4?), medida del solar, y cómo se subdividieron los solares hasta el siglo XIX (medios y cuartos de solar). Leyes de Indias / Ordenanzas de 1573 sobre solares. Cuántas casas tenía una manzana del centro en cada época (${EPOCAS}).` },
  { id: 'casas', q: `Cuántas casas y cuántos habitantes tenía Caracas en cada época: 1578; 1772 (visita del obispo Mariano Martí: casas y almas por parroquia); hacia 1800 (Humboldt, Depons); 1841–1843 (Agustín Codazzi, «Resumen de la geografía de Venezuela»; el texto del propio plano de Jesurún de 1843); 1873 y 1881/1891 (censos nacionales); 1911; 1936 (censo). Habitantes por casa. Distinguir la ciudad (parroquias urbanas) del cantón o departamento.` },
  { id: 'calles', q: `Ancho de las calles de Caracas por época (${EPOCAS}): en varas castellanas y metros; ordenanzas coloniales; aceras; si las calles se ensancharon en el siglo XIX o con Guzmán Blanco; ancho típico de calle en ciudades hispanoamericanas de damero.` },
  { id: 'tipologia', q: `La casa colonial y republicana caraqueña (Graziano Gasparini, «La casa colonial venezolana»; Carlos F. Duarte; estudios de la casa de patio): frente típico (varas/metros) y fondo del lote; casa grande del centro vs casa de las orillas (casa de una crujía, bahareque); zaguán, corredores, patio principal, traspatio, corral; qué abre a la calle (portón, ventanas con reja, balcón) y qué abre al patio (corredor, puertas de las habitaciones); medianeras; número de pisos por época (${EPOCAS}).` },
  { id: 'pueblos', q: `Pueblos y ciudades hispanoamericanos que conservan el tejido colonial parecido a la Caracas de 1772–1843 (por ejemplo Coro, Carora, El Tocuyo, La Asunción, Petare, Barichara, Villa de Leyva, Mompox, Antigua Guatemala, Popayán): cuántas casas hay por manzana o por frente de cuadra, frente típico de las casas, tamaño de manzana. Datos medidos o de catastro con fuente.` },
  { id: 'edificios', q: `Edificios públicos, iglesias y conventos de Caracas en pie en cada época (${EPOCAS}), con fecha de construcción y de demolición o transformación: Catedral, San Francisco, La Merced, San Mauricio (Santa Capilla), San Pablo, Altagracia, Candelaria, Santa Rosalía, La Pastora, La Trinidad (Panteón), Concepciones, Carmelitas, San Jacinto, Seminario y Universidad, Casa de Gobierno / Casa Amarilla, Palacio Arzobispal, mercado de la Plaza Mayor, puentes. Compara con las marcas de src/marcas-datos.js del repo (lee el archivo) y avisa de diferencias.` },
  { id: 'agua', q: `Ríos y quebradas de Caracas (Guaire, Catuche, Caroata, Anauco, otras quebradas) y sus puentes por época (${EPOCAS}): recorrido respecto de la ciudad, si la quebrada Caroata llegaba al Guaire por el oeste de la ciudad, fechas de los puentes (de la Pastora, Trinidad, Punceres, Candelaria, San Pablo, de Hierro…), embaulamientos.` },
]
const AFIRMACIONES = {
  type: 'object', required: ['afirmaciones'],
  properties: { afirmaciones: { type: 'array', items: { type: 'object',
    required: ['id', 'epoca', 'afirmacion', 'fuente', 'cita', 'confianza'],
    properties: {
      id: { type: 'string' }, epoca: { type: 'string' }, afirmacion: { type: 'string' },
      valor: { type: 'string' }, unidad: { type: 'string' },
      fuente: { type: 'object', required: ['titulo', 'url'], properties: {
        titulo: { type: 'string' }, autor: { type: 'string' }, año: { type: 'string' }, url: { type: 'string' } } },
      cita: { type: 'string' }, confianza: { type: 'string', enum: ['alta', 'media', 'baja'] }, notas: { type: 'string' },
    } } } },
}
const VEREDICTOS = {
  type: 'object', required: ['veredictos'],
  properties: { veredictos: { type: 'array', items: { type: 'object', required: ['id', 'veredicto', 'motivo'],
    properties: { id: { type: 'string' }, veredicto: { type: 'string', enum: ['confirmada', 'corregida', 'refutada', 'no_verificable'] },
      motivo: { type: 'string' }, valor_corregido: { type: 'string' } } } } },
}
const TABLA = {
  type: 'object', required: ['filas', 'vacios'],
  properties: {
    filas: { type: 'array', items: { type: 'object', required: ['valor', 'epoca', 'resultado', 'afirmaciones', 'razonamiento'],
      properties: { valor: { type: 'string' }, epoca: { type: 'string' }, resultado: { type: 'string' }, minimo: { type: 'number' },
        maximo: { type: 'number' }, unidad: { type: 'string' }, afirmaciones: { type: 'array', items: { type: 'string' } },
        razonamiento: { type: 'string' }, inferido: { type: 'boolean' } } } },
    vacios: { type: 'array', items: { type: 'string' } },
  },
}
const elegidos = args?.temas ? TEMAS.filter((t) => args.temas.includes(t.id)) : TEMAS
const buscar = (t) => agent(`Investigación para las reglas de construcción del mapa histórico de Caracas (este repositorio; reglas en specs/13-reglas-de-construccion.md, léelo primero). Tema «${t.id}»:

${t.q}

Busca en la web (WebSearch y WebFetch; cárgalas con ToolSearch si no las tienes) y en el repo (fuentes/imagenes/README.md, specs/, fuentes/mapas/*/ficha.json). Prefiere fuentes primarias y académicas (libros, tesis, revistas, archivos digitalizados) a blogs. Abre cada página que cites: la cita tiene que ser textual de esa página. No inventes cifras ni fuentes; si algo no se encuentra, dilo en una afirmación con confianza baja y notas. No envíes en las búsquedas datos personales de nadie.

Devuelve afirmaciones atómicas (una cifra o un hecho cada una), con id «${t.id}-NN», época (año, rango o «todas»), valor y unidad si es una cifra, fuente (título, autor, año, url), cita textual y confianza.`,
  { label: `buscar:${t.id}`, phase: 'Buscar', schema: AFIRMACIONES })
const verificar = (r, t) => agent(`Verificación adversarial (T82, specs/13). Otro agente investigó el tema «${t.id}» y devolvió estas afirmaciones:

${JSON.stringify(r?.afirmaciones ?? [], null, 1)}

Para cada una, abre su url (WebFetch) e intenta REFUTARLA: ¿la página dice eso, con esa cifra y para esa época y ese lugar (la ciudad de Caracas, no el cantón ni la provincia)? Busca una segunda fuente si puedes. Veredicto: confirmada, corregida (da valor_corregido), refutada o no_verificable (la página no abre o no lo dice). Ante la duda, no la confirmes.`,
  { label: `verificar:${t.id}`, phase: 'Verificar', schema: VEREDICTOS }).then((v) => ({ tema: t.id, afirmaciones: r?.afirmaciones ?? [], veredictos: v?.veredictos ?? [] }))
const temas = (await pipeline(elegidos, buscar, verificar)).filter(Boolean)
phase('Sintetizar')
const tabla = await agent(`Síntesis de la investigación de T82 (specs/13 § 3). Arma la tabla de valores por época (${EPOCAS}) con SOLO las afirmaciones confirmadas o corregidas (usa el valor corregido):

${JSON.stringify(temas, null, 1)}

Filas: casas en la ciudad, habitantes, habitantes por casa, solares por manzana, casas por manzana (centro y orillas), frente de casa (centro y orillas), fondo de lote, ancho mínimo de calle, pisos; y una fila por edificio o cauce con su vida (construido, demolido) cuando lo haya. Si las fuentes difieren, da un rango (mínimo, máximo) y explica. Si para una época no hay fuente pero se puede interpolar entre épocas con fuente, márcalo inferido=true con el razonamiento. Lista en «vacios» lo que sigue sin fuente.`,
  { label: 'sintetizar', phase: 'Sintetizar', schema: TABLA })
return { temas, tabla }
