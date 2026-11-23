// Los pasos del pipeline de datos (npm run datos, tools/datos.mjs): de qué entradas y de qué código sale cada
// salida. `npm run datos:al-dia` usa la misma lista para avisar cuando el release publicado quedó viejo.
// Sin efectos al importarse: solo constantes y los comandos de cada paso.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const PY = process.env.PY ?? '.venv/bin/python'
export const D = 'fuentes/derivados/1936'
const E = 'fuentes/derivados/epocas'
// planos de la línea de tiempo que se calzan sobre 1936: [año, carpeta en fuentes/mapas/]
export const CALCES = [
  [1911, '1911-princeton-plano-de-caracas-razetti'],
  [1889, '1889-bnf-mestre'],
  [1843, '1843-nypl-jesurun-facsimil-muller-stapler'],
  [1772, '1772-pares-agi-exato-mapa'],
]
const HOJA = (n) => `fuentes/mapas/1936-archiveorg-caracas-dcn-hoja${n}/original.tif`
const PLANO = ['primero', 'chico', 'medio-4k', 'medio'].map((n) => `public/plano/${n}.webp`)
export const leerJson = async (ruta) => JSON.parse(await readFile(path.join(RAIZ, ruta), 'utf8'))
export const leerJsonSiHay = (ruta) => leerJson(ruta).catch(() => null)
const GEO = (...nombres) => nombres.map((n) => `tools/geo/${n}.py`)
const OSM_HOY = 'fuentes/derivados/hoy/osm.json'
export const DESCARGAR = process.argv.includes('--descargar') // vuelve a bajar OSM aunque haya caché

export const PASOS = [
  ...[1, 2].map((n) => ({
    id: `cuadricula-${n}`, entradas: [HOJA(n), 'tools/geo/gcp/semillas-1936.json'],
    salidas: [`tools/geo/gcp/1936-hoja${n}.json`, `tools/geo/gcp/1936-hoja${n}-lineas.json`],
    codigo: GEO('cuadricula', 'tps'),
    cmd: () => [PY, 'tools/geo/cuadricula.py', '--semillas', 'tools/geo/gcp/semillas-1936.json', '--hoja', `1936-hoja${n}`],
  })),
  {
    id: 'mosaico',
    entradas: ['tools/geo/mosaico-1936.json', ...[1, 2].flatMap((n) => [`tools/geo/gcp/1936-hoja${n}.json`, `tools/geo/gcp/1936-hoja${n}-lineas.json`])],
    codigo: GEO('mosaico', 'lineas', 'tps'),
    salidas: [`${D}/mosaico.tif`, `${D}/mosaico.json`],
    cmd: () => [PY, 'tools/geo/mosaico.py', '--config', 'tools/geo/mosaico-1936.json'],
  },
  {
    id: 'segmentar', entradas: [`${D}/mosaico.tif`, 'tools/geo/paleta-1936.json'],
    codigo: GEO('segmentar', 'segmentar_arboles', 'segmentar_clases', 'segmentar_color', 'segmentar_marco',
      'segmentar_morfologia', 'segmentar_parametros', 'segmentar_salidas', 'segmentar_texturas', 'segmentar_topologia'),
    salidas: [`${D}/segmentacion/mosaico/clases.png`, `${D}/segmentacion/mosaico/arboles.json`],
    cmd: () => [PY, 'tools/geo/segmentar.py', `${D}/mosaico.tif`, `${D}/segmentacion/mosaico`, '--escala', '0.5'],
  },
  {
    id: 'costura', codigo: GEO('costura'), entradas: [`${D}/mosaico.tif`, `${D}/mosaico.json`, `${D}/segmentacion/mosaico/clases.png`],
    salidas: [`${D}/mosaico-costura.tif`, `${D}/segmentacion/mosaico/clases-costura.png`],
    cmd: () => [PY, 'tools/geo/costura.py', '--mosaico', `${D}/mosaico.tif`, '--meta', `${D}/mosaico.json`,
      '--clases', `${D}/segmentacion/mosaico/clases.png`],
  },
  // --- los planos viejos calzados sobre 1936: solo leen la costura, y calles-nuevas lee el de 1772 ---
  ...CALCES.map(([año, carpeta]) => ({
    id: `calce-${año}`,
    entradas: [`original:${carpeta}`, `fuentes/mapas/${carpeta}/ficha.json`, `tools/geo/gcp/calce-${carpeta}.json`,
      'tools/geo/gcp/plaza-1936.json',
      `${D}/mosaico.json`, `${D}/segmentacion/mosaico/clases-costura.png`],
    salidas: [`fuentes/derivados/${año}/calzado.tif`, `fuentes/derivados/${año}/calzado.json`],
    codigo: GEO('calce', 'calce_correlacion', 'tps'),
    cmd: () => [PY, 'tools/geo/calce.py', carpeta],
  })),
  {
    // la única descarga del pipeline: solo si falta la caché (o con --descargar); sin código propio,
    // así un cambio en hoy.py no vuelve a pedirle a Overpass (vectorizar corta con sus calles las manzanas unidas por un jardín)
    id: 'hoy-osm', entradas: [], salidas: [OSM_HOY], codigo: [],
    cmd: () => [PY, 'tools/geo/hoy.py', '--solo-descargar', '--osm', OSM_HOY, ...(DESCARGAR ? ['--descargar'] : [])],
  },
  {
    // la red de calles de hoy en tramos, cada uno con lo que dicen los planos (¿estaba en 1936?, ¿es nuevo desde
    // 1772?), y lo edificado de 1772 ya corregido: con eso vectorizar arma las cuadras de cada época
    id: 'calles-nuevas',
    entradas: [`${D}/segmentacion/mosaico/clases-costura.png`, `${D}/mosaico.json`, OSM_HOY, 'tools/geo/gcp/1936-wgs84.json', 'tools/geo/calles-historicas.json',
      'fuentes/derivados/1772/calzado.tif', 'fuentes/derivados/1772/calzado.json', 'tools/geo/epocas/epocas.json'],
    salidas: [`${D}/tramos.json`, `${D}/edificado-1772.png`],
    codigo: GEO('calles_nuevas', 'calles_historicas', 'caras', 'lados', 'calce_correlacion', 'epocas', 'hoy_osm', 'geo1936'),
    cmd: async () => {
      const { metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/calles_nuevas.py', `${D}/segmentacion/mosaico/clases-costura.png`, `${D}/tramos.json`,
        '--osm', OSM_HOY, '--edificado', `${D}/edificado-1772.png`, '--escala', String(metro)]
    },
  },
  {
    id: 'vectorizar', entradas: [`${D}/segmentacion/mosaico/clases-costura.png`, `${D}/mosaico.json`, `${D}/tramos.json`, `${D}/edificado-1772.png`, 'tools/geo/cuadras-1772.json',
      'tools/geo/referencias/1772-red.json', 'tools/geo/referencias/1772-unidades.json',
      'specs/auditoria-1772/edificado-original.json', 'specs/auditoria-1772/edificado-revisado.json',
      'specs/auditoria-1772/limites-calce.json', 'tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json',
      'tools/geo/calles-historicas.json', 'tools/geo/referencias/1772-calles-1936.json'],
    salidas: [`${D}/ciudad-1936.json`, `${D}/patios-de-casas.png`],
    codigo: [...GEO('vectorizar', 'lotes', 'alas', 'cuadra', 'lados', 'caras', 'huellas', 'cuadras_historicas', 'edificado_original', 'calce', 'tps', 'cierre_fase3', 'fachadas'),
      'tools/hitos-planta.mjs', 'src/hitos/plantas.js', ...['catedral', 'iglesias', 'civiles', 'panteon', 'plaza-bolivar', 'marco'].map((n) => `src/hitos/datos/${n}.js`)],
    cmd: async () => {
      const { plaza, metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/vectorizar.py', `${D}/segmentacion/mosaico/clases-costura.png`, `${D}/ciudad-1936.json`,
        '--escala', String(metro), '--plaza', plaza.join(','), '--patios', `${D}/patios-de-casas.png`,
        '--tramos', `${D}/tramos.json`, '--edificado-1772', `${D}/edificado-1772.png`]
    },
  },
  // --- la línea de tiempo: la ciudad de 1578 y las épocas (los calces van antes, después de la costura) ---
  {
    // plaza-1936.json da las semillas de las esquinas y la ruta de las clases (clases-costura.png)
    id: 'epocas-1578',
    entradas: ['tools/geo/epocas/1578-pimentel.json', 'tools/geo/gcp/plaza-1936.json', `${D}/mosaico.json`,
      `${D}/segmentacion/mosaico/clases-costura.png`],
    salidas: ['fuentes/derivados/1578/ciudad-1578.json'],
    codigo: GEO('epocas_1578', 'vectorizar'),
    cmd: () => [PY, 'tools/geo/epocas_1578.py'],
  },
  {
    id: 'epocas',
    entradas: ['tools/geo/epocas/epocas.json', `${D}/ciudad-1936.json`, 'fuentes/derivados/1578/ciudad-1578.json',
      ...CALCES.map(([año]) => `fuentes/derivados/${año}/calzado.tif`), 'tools/geo/referencias/1772-calles-1936.json',
      'tools/geo/referencias/1772-red.json', 'tools/geo/calles-historicas.json', 'tools/geo/referencias/1772-unidades.json',
      'specs/auditoria-1772/edificado-original.json', 'specs/auditoria-1772/edificado-revisado.json',
      'specs/auditoria-1772/limites-calce.json', 'tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json'],
    salidas: [`${E}/ciudad-epocas.json`, `${E}/crece.json`, 'public/datos/crece.json', 'public/plano/crece.png'],
    // relieve.bin (tools/geo/relieve.py, fuera de este pipeline) da las cuestas y la altura del monte
    opcionales: ['public/datos/relieve.bin'],
    codigo: [...GEO('epocas', 'valle', 'calce_correlacion', 'vectorizar', 'segmentar_clases', 'calles_1772', 'cuadras_historicas', 'cierre_fase3',
      'cierre_fase4', 'cierre_fase5', 'cierre_fase7', 'fachadas', 'accesos', 'calce', 'edificado_original'),
      'tools/hitos-planta.mjs', 'src/hitos/plantas.js', ...['catedral', 'iglesias', 'civiles', 'panteon', 'plaza-bolivar', 'marco'].map((n) => `src/hitos/datos/${n}.js`)],
    cmd: () => [PY, 'tools/geo/epocas.py'],
  },
  {
    id: 'estilos', entradas: [`${E}/ciudad-epocas.json`, `${D}/mosaico.json`], salidas: [`${E}/ciudad-estilos.json`],
    codigo: GEO('estilos'),
    cmd: async () => {
      const { plaza, metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/estilos.py', `${E}/ciudad-epocas.json`, `${E}/ciudad-estilos.json`,
        '--escala', String(metro), '--plaza', plaza.join(',')]
    },
  },
  {
    // la ciudad que se publica: la de las épocas, con estilos (la de 1936 sola no tiene "vida")
    id: 'empacar', entradas: [`${E}/ciudad-estilos.json`], salidas: ['public/datos/ciudad.pak'],
    codigo: ['tools/empacar-ciudad.mjs', 'tools/empacar-lib.mjs', 'tools/pak.mjs', 'src/ciudad.js'],
    cmd: () => ['node', 'tools/empacar-ciudad.mjs', `${E}/ciudad-estilos.json`],
  },
  {
    id: 'jardines', codigo: GEO('jardines'),
    entradas: [`${D}/segmentacion/mosaico/clases-costura.png`, `${D}/segmentacion/mosaico/arboles.json`],
    salidas: [`${D}/segmentacion/mosaico/jardines.json`],
    cmd: () => [PY, 'tools/geo/jardines.py', `${D}/segmentacion/mosaico/clases-costura.png`,
      `${D}/segmentacion/mosaico/arboles.json`, `${D}/segmentacion/mosaico/jardines.json`],
  },
  {
    // crece.png/crece.json (tools/geo/epocas.py, fuera de este pipeline) dan la época de cada árbol si
    // están; sin ellos todos nacen en la primera: son opcionales (si aparecen o cambian, el paso se rehace)
    id: 'arboles',
    // y el monte del valle (los árboles silvestres) sale de crece.png (G y B) y de la segmentación de 1936
    entradas: [`${D}/segmentacion/mosaico/arboles.json`, `${D}/segmentacion/mosaico/jardines.json`, `${D}/mosaico.json`,
      'public/datos/ciudad.pak', `${D}/segmentacion/mosaico/clases-costura.png`],
    opcionales: ['public/plano/crece.png', 'public/datos/crece.json'],
    salidas: ['public/datos/arboles.bin'],
    codigo: ['tools/arboles.mjs', 'tools/arboles-lib.mjs', 'tools/silvestres-lib.mjs', 'src/pak.js', 'src/epocas.js', 'src/alas.js', 'src/techos.js'],
    cmd: () => ['node', 'tools/arboles.mjs', `${D}/segmentacion/mosaico/arboles.json`, `${D}/mosaico.json`,
      `${D}/segmentacion/mosaico/jardines.json`, `${D}/segmentacion/mosaico/clases-costura.png`],
  },
  {
    // con los patios que el vectorizador abrió por regla en las casas de patio: ahí el suelo es de patio
    id: 'suelo', entradas: [`${D}/segmentacion/mosaico/clases-costura.png`, `${D}/patios-de-casas.png`],
    salidas: ['public/plano/suelo.webp', 'public/plano/suelo-2k.webp'],
    codigo: ['tools/suelo.mjs', 'tools/suelo-lib.mjs'],
    cmd: () => ['node', 'tools/suelo.mjs', `${D}/segmentacion/mosaico/clases-costura.png`, `${D}/patios-de-casas.png`],
  },
  {
    // lo que en el plano es letra, cifra o símbolo y no dibujo: en modo color no se marca
    id: 'rotulos', entradas: [`${D}/mosaico-costura.tif`, `${D}/mosaico.json`, 'tools/geo/paleta-1936.json'],
    salidas: [`${D}/segmentacion/mosaico/rotulos.png`],
    codigo: GEO('rotulos', 'segmentar', 'segmentar_color', 'segmentar_morfologia', 'segmentar_parametros'),
    cmd: async () => {
      const { metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/rotulos.py', `${D}/mosaico-costura.tif`, `${D}/segmentacion/mosaico/rotulos.png`, '--escala', String(metro)]
    },
  },
  {
    id: 'rotulos-textura', entradas: [`${D}/segmentacion/mosaico/rotulos.png`],
    salidas: ['public/plano/rotulos.webp', 'public/plano/rotulos-2k.webp'],
    codigo: ['tools/rotulos.mjs', 'tools/rotulos-lib.mjs'],
    cmd: () => ['node', 'tools/rotulos.mjs', `${D}/segmentacion/mosaico/rotulos.png`],
  },
  {
    id: 'plano', entradas: [`${D}/mosaico-costura.tif`, `${D}/mosaico.json`],
    // + las teselas de public/plano/f/ según laminas.json (se suman al arrancar, ver pasosCompletos)
    salidas: ['public/plano/laminas.json', 'public/datos/ciudad.json', ...PLANO],
    codigo: ['tools/plano.mjs', 'tools/plano-lib.mjs'],
    cmd: () => ['node', 'tools/plano.mjs', `${D}/mosaico-costura.tif`, `${D}/mosaico.json`],
  },
  {
    // los planos viejos calzados sobre 1936 (pasos calce-<año>): una textura con alfa por época; las
    // salidas según el recorte de cada calzado.json (se suman en pasosCompletos)
    id: 'planos-epocas', salidas: ['public/plano/epocas.json'],
    entradas: CALCES.flatMap(([año]) => ['tif', 'json'].map((x) => `fuentes/derivados/${año}/calzado.${x}`)),
    codigo: ['tools/planos-epocas.mjs', 'tools/planos-epocas-lib.mjs'],
    cmd: () => ['node', 'tools/planos-epocas.mjs'],
  },
  {
    id: 'hoy', entradas: [OSM_HOY, `${D}/mosaico.json`, 'tools/geo/gcp/1936-wgs84.json'],
    salidas: ['public/plano/hoy-lejos.webp', 'public/plano/hoy-cerca.webp', 'public/datos/calles.json', 'public/datos/calles.bin'],
    codigo: GEO('hoy', 'hoy_osm', 'geo1936'),
    cmd: () => [PY, 'tools/geo/hoy.py', '--osm', OSM_HOY],
  },
  {
    // las fotos de las fichas: solo las que su ficha permite publicar (tools/fotos-lib.mjs); las entradas (las
    // fichas y los originales que haya) y las salidas (un par de .webp por foto) se suman en pasosCompletos
    id: 'fotos', entradas: [], salidas: ['public/datos/fotos.json'],
    codigo: ['tools/fotos.mjs', 'tools/fotos-lib.mjs', 'src/marcas-datos.js'],
    cmd: () => ['node', 'tools/fotos.mjs'],
  },
  {
    // los créditos del «Acerca»: las fichas de las fuentes que el sitio usa (tools/creditos-lib.mjs); las
    // fichas de los planos y de fuentes/datos/ se suman en pasosCompletos
    id: 'creditos', salidas: ['public/datos/creditos.json'],
    entradas: ['public/datos/crece.json', 'public/datos/fotos.json', 'tools/geo/mosaico-1936.json', 'package.json'],
    codigo: ['tools/creditos.mjs', 'tools/creditos-lib.mjs', 'src/epocas.js'],
    cmd: () => ['node', 'tools/creditos.mjs'],
  },
]
