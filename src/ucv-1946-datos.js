/**
 * Marcas y fichas de la Ciudad Universitaria en 1946 y de la hacienda que ocupó (#264). Mismo formato que
 * src/marcas-datos.js y src/fichas-datos.js. No hay hito: ningún edificio consta como terminado en 1946 y ninguna
 * fuente describe el avance de cada uno ese año (docs/issue-264-ciudad-universitaria.md).
 *
 * Posición: el centro del rótulo de cada plano, en píxeles del mosaico de 1936. El de 1946 se lleva al mosaico
 * con tools/geo/gcp/1946-cuadricula.json; la lectura está en tools/geo/referencias/1946-ciudad-universitaria.json.
 */
const P36 = 'plano DCN de 1936'
const P46 = 'plano DCN basado en fotografías aéreas de 1946: https://archive.org/details/WCWdb_18051'
const UNESCO = 'expediente de nominación UNESCO n.º 986, fichas por edificio: https://whc.unesco.org/uploads/nominations/986.pdf'
const SANTACRUZ = 'Ariadna Santacruz, «Hitos en la gestación del proyecto de construcción de la CUC» (2008): https://trienal.fau.ucv.ve/2008/documentos/cs/CS-8.pdf'
const CORBACHO = 'Roger Corbacho Moreno, tesis doctoral (UPC, 2001), cap. 5: https://www.tdx.cat/bitstream/handle/10803/6074/05CAPITOL5.pdf?sequence=6&isAllowed=y'
const GIACOPINI = 'María Isabel Giacopini, Tribuna del Investigador 21(1), 2020: https://saber.ucv.ve/ojs/index.php/rev_ti/article/download/19847/144814486175'

export const MARCAS_CIUDAD_UNIVERSITARIA = Object.freeze([
  { id: 'hacienda-ibarra', nombre: 'Hacienda Ibarra', x: 15136, y: 9569, nace: 5, muere: 6, nivel: 2,
    nota: 'La hacienda que ocupaba el lugar antes de la Ciudad Universitaria.',
    fuente: `${P36} («Hda. Ybarra»); compra de diciembre de 1943: ${GIACOPINI}`,
    dudas: 'Marca del fundo, no de un edificio. El plano de 1936 es el primero del catálogo que cubre el lugar: la hacienda es anterior, pero no se adelanta la marca sin un plano que la muestre.' },
  { id: 'ciudad-universitaria', nombre: 'Ciudad Universitaria (en construcción)', x: 14550, y: 10172, nace: 6, nivel: 1,
    nota: 'En obras desde 1944. Ningún edificio consta como terminado en 1946.',
    fuente: `${P46}, rótulo «Ciudad Universitaria (en construcción)»; ${UNESCO}; ${SANTACRUZ}; ${CORBACHO}`,
    dudas: 'Marca del recinto en obras, sin edificios: el plano no da alturas ni avance, y dibuja con el mismo relleno la Escuela Técnica Industrial, cuya obra es posterior a 1946.' },
])

export const FICHAS_CIUDAD_UNIVERSITARIA = Object.freeze({
  'hacienda-ibarra': {
    textos: [[5, 'El plano de 1936 rotula «Hda. Ybarra» y dibuja sus casas sobre una loma, con los tablones de cultivo al sur y al oeste. El Estado compró la hacienda en diciembre de 1943 para levantar allí la Ciudad Universitaria.']],
    hoy: 'La Ciudad Universitaria de Caracas, sede de la Universidad Central de Venezuela.',
    dudas: 'El plano no dice qué se cultivaba; la caña consta para 1944, cuando se propuso el Jardín Botánico sobre 70 hectáreas de cañaveral. Cuál de las casas era la principal no está identificado.',
  },
  'ciudad-universitaria': {
    textos: [[6, 'El Instituto de la Ciudad Universitaria se creó por decreto el 2 de octubre de 1943, y en diciembre el Estado compró la hacienda Ibarra. En 1944 solo hubo movimiento de tierras y drenajes. Desde 1945 se construye la zona médica: el Hospital Clínico y los institutos Anatómico, de Medicina Experimental y Anatomopatológico. En marzo de 1946 se rescindió el contrato del hospital, cuando las constructoras habían ejecutado el 20 % de lo estipulado. Ningún edificio consta como terminado en 1946: los primeros de los que hay fecha se completaron en 1949 y el hospital se inauguró en 1954. El plano de 1946 dibuja esas plantas y rotula el conjunto «en construcción». El Aula Magna, la Biblioteca y los estadios son posteriores.']],
    hoy: 'La Ciudad Universitaria de Caracas, sede de la Universidad Central de Venezuela.',
    dudas: 'No se levantan los edificios en obra: ninguna fuente consultada describe el avance de cada uno en 1946, y el plano no da alturas. El ejemplar del plano está catalogado [1950?] y puede traer información posterior a las fotografías. Las fuentes discrepan sobre el inicio de la obra del hospital (1943, octubre de 1944 o enero de 1945).',
  },
})
