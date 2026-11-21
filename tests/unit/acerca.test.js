import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  AUTOR,
  REPOSITORIO, INSPIRACION, enlaceSeguro, sitioDe, enumerar, conMiles, validarCreditos, leerCreditos, epocasVisibles, queEstasViendo,
  bloqueDeEpoca, bloquesDeFuentes, seccionesDeAcerca, bloqueDeVersion,
} from '../../src/acerca.js'
import { ACCIONES } from '../../src/controles.js'
import { pieDeEpoca, PRIMERA_EPOCA } from '../../src/epocas.js'
import { armarCreditos, SIN_LICENCIA } from '../../tools/creditos-lib.mjs'

const RAIZ = path.resolve(import.meta.dirname, '../..')
const leer = (ruta) => JSON.parse(readFileSync(path.join(RAIZ, ruta), 'utf8'))

const EPOCAS = [
  { año: 1578, corto: 'esquema de Pimentel (1578)', titulo: 'El primer dibujo', autor: 'Juan de Pimentel', casas: 65 },
  { año: 1772, corto: 'Exato mapa (1772)', obras: 'El damero ya llena el valle.', titulo: '"Exato mapa"', autor: 'Juan Vicente Bolívar', casas: 1968 },
  { año: 1889, corto: 'plano de Mestre (1889)', titulo: 'Plano topografico', autor: 'Vicente S. Mestre', casas: 6724 },
  { año: 1936, corto: 'plano del DCN (1936)', obras: 'La Cartografía Nacional restituye la ciudad.', titulo: 'Caracas. No. 7 — hoja 1 de 2', autor: 'Dirección de Cartografía Nacional', casas: 33921 },
]
const CREDITOS = {
  mapas: [
    { id: 'mestre', año: 1889, titulo: 'Plano topografico', hojas: 1, autor: 'Vicente S. Mestre', institucion: 'BnF', url: 'https://commons.wikimedia.org/wiki/File:Mestre.jpg', licencia: 'Dominio público (Wikimedia Commons)', porVerificar: false, base: false, epocas: [1889] },
    { id: 'dcn', año: 1936, titulo: 'Caracas. No. 7', hojas: 2, autor: 'Dirección de Cartografía Nacional', institucion: 'University of Alberta', url: 'https://archive.org/details/WCWdb_18053', licencia: SIN_LICENCIA, porVerificar: true, base: true, epocas: [1936] },
  ],
  datos: [{ id: 'osm', titulo: 'Calles de hoy', tipo: 'vectorial', autor: 'Colaboradores de OpenStreetMap', institucion: 'OSMF', url: 'https://www.openstreetmap.org/copyright', licencia: 'Open Database License (ODbL) 1.0', porVerificar: false, atribucion: '© colaboradores de OpenStreetMap' }],
  fotos: [{ id: 'a', titulo: 'La plaza.', autor: 'Autor desconocido', fecha: '1910', licencia: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:A.jpg', institucion: null }],
  programas: [{ nombre: 'three', version: '0.187.0', licencia: 'MIT', url: 'https://threejs.org/' }],
}
const textoDe = (bloques) => JSON.stringify(bloques)

describe('enlaceSeguro', () => {
  it('deja pasar http y https', () => {
    expect(enlaceSeguro('https://archive.org/details/WCWdb_18053')).toBe('https://archive.org/details/WCWdb_18053')
    expect(enlaceSeguro(' http://ejemplo.org/a ')).toBe('http://ejemplo.org/a')
  })

  it('rechaza todo lo demás: javascript:, data:, rutas sueltas, lo que no es texto', () => {
    for (const malo of ['javascript:alert(1)', 'data:text/html,<script>', 'vbscript:x', '/relativa', 'archive.org', '', null, undefined, 7, {}]) {
      expect(enlaceSeguro(malo), String(malo)).toBeNull()
    }
  })
})

describe('utilidades de texto', () => {
  it('sitioDe nombra el sitio de un enlace', () => {
    expect(sitioDe('https://commons.wikimedia.org/wiki/File:A.jpg')).toBe('Wikimedia Commons')
    expect(sitioDe('https://www.openstreetmap.org/copyright')).toBe('openstreetmap.org')
  })

  it('enumerar une con comas y una «y» final', () => {
    expect(enumerar([])).toBe('')
    expect(enumerar([1772])).toBe('1772')
    expect(enumerar([1772, 1843])).toBe('1772 y 1843')
    expect(enumerar([1772, 1843, 1889, 1911])).toBe('1772, 1843, 1889 y 1911')
  })

  it('conMiles separa los miles con punto', () => {
    expect(conMiles(65)).toBe('65')
    expect(conMiles(1968)).toBe('1.968')
    expect(conMiles(33921)).toBe('33.921')
    expect(conMiles(1234567)).toBe('1.234.567')
  })
})

describe('validarCreditos', () => {
  it('acepta lo que escribe tools/creditos.mjs', () => {
    expect(validarCreditos(CREDITOS)).toEqual(CREDITOS)
  })

  it('descarta las filas incompletas y los enlaces que no son http(s)', () => {
    // Arrange
    const sucio = {
      mapas: [CREDITOS.mapas[0], { titulo: 'Sin licencia' }, null, 'texto', { ...CREDITOS.mapas[1], url: 'javascript:alert(1)' }],
      datos: 'no es una lista', fotos: [{ titulo: 'Sin autor', licencia: 'CC0', fecha: '1900' }], programas: [{ nombre: 'x' }],
    }
    // Act
    const c = validarCreditos(sucio)
    // Assert
    expect(c.mapas.map((m) => m.id)).toEqual(['mestre', 'dcn'])
    expect(c.mapas[1].url).toBeNull()
    expect(c.datos).toEqual([])
    expect(c.fotos).toEqual([])
    expect(c.programas).toEqual([{ nombre: 'x', url: null }])
  })

  it('si no hay nada que mostrar, null', () => {
    for (const nada of [null, undefined, 'x', 3, {}, { mapas: [], datos: [], fotos: [], programas: [] }]) expect(validarCreditos(nada)).toBeNull()
  })
})

describe('leerCreditos', () => {
  it('pide datos/creditos.json y lo valida', async () => {
    const pedidos = []
    const c = await leerCreditos(async (url) => { pedidos.push(url); return { ok: true, json: async () => CREDITOS } })
    expect(pedidos).toEqual(['datos/creditos.json'])
    expect(c.mapas).toHaveLength(2)
  })

  it('sin archivo, con otra cosa en su lugar o sin red, null (la ciudad de demostración no lo trae)', async () => {
    expect(await leerCreditos(async () => ({ ok: false, status: 404 }))).toBeNull()
    expect(await leerCreditos(async () => ({ ok: true, json: async () => { throw new SyntaxError('<!doctype html>') } }))).toBeNull()
    expect(await leerCreditos(async () => { throw new TypeError('Failed to fetch') })).toBeNull()
  })
})

describe('queEstasViendo', () => {
  it('nombra los años anteriores que trae la línea de tiempo', () => {
    const texto = queEstasViendo([1772, 1843]).map((p) => p.texto).join(' ')
    expect(texto).toContain('La ciudad de 1772 y 1843 no está dibujada de nuevo.')
  })

  it('sin línea de tiempo no inventa años', () => {
    const parrafo = queEstasViendo().find((p) => p.rotulo === 'Los años anteriores')
    expect(parrafo.texto).toMatch(/^La ciudad de los años anteriores no está dibujada de nuevo\./)
  })

  it('dice qué es del plano y qué es reconstrucción, sin vender de más', () => {
    const parrafos = queEstasViendo([1772])
    expect(parrafos.map((p) => p.rotulo)).toEqual(['El plano', 'Lo que sale del plano', 'Lo que es reconstrucción', 'Los edificios con nombre', 'Los años anteriores', 'La hoja de cada año', 'El error', 'Lo de hoy', 'Los nombres y las fotos'])
    const texto = parrafos.map((p) => p.texto).join(' ')
    expect(texto).toMatch(/por regla/)
    expect(texto).toMatch(/verosímiles, no documentados/)
    expect(texto).toMatch(/Ninguna casa común está medida ni retratada/)
    expect(texto).toMatch(/no es del original/)
    expect(texto).not.toMatch(/exact[oa]s?\b|fiel|tal como era|idéntic/i)
  })

  describe('lo que afirma es cierto según el pipeline', () => {
    const texto = queEstasViendo([1772, 1843, 1889, 1911]).map((p) => p.texto).join(' ')
    const calce = Object.fromEntries(readdirSync(path.join(RAIZ, 'tools/geo/gcp')).filter((n) => n.startsWith('calce-'))
      .map((n) => leer(`tools/geo/gcp/${n}`)).map((c) => [c.año, c.residuos_m]))

    it('los residuos del calce de cada plano son los que dice «El error»', () => {
      expect(texto).toMatch(/1889 y 1911 coinciden con el de 1936 con pocos metros/)
      expect(texto).toMatch(/el de 1843, más viejo y menos preciso, se aparta entre 10 y 15 m/)
      for (const año of [1889, 1911]) expect(calce[año].rms, String(año)).toBeLessThan(10)
      expect(calce[1843].rms).toBeGreaterThan(10)
      expect(calce[1843].rms).toBeLessThan(15)
      for (const año of [1843, 1889, 1911]) expect(calce[año].max, String(año)).toBeLessThan(26) // «hasta unos 25 m»
    })

    it('el calce de 1772 por identidad: unos 20 m de media y más de 50 m en algunos cruces de las orillas', () => {
      expect(texto).toMatch(/El de 1772 se calza solo con cruces y edificios identificados uno a uno y se aparta unos 20 m/)
      expect(texto).toMatch(/más de 50 m en algunos cruces de las orillas/)
      expect(calce[1772].rms).toBeGreaterThan(15)
      expect(calce[1772].rms).toBeLessThan(25) // «unos 20 m»
      expect(calce[1772].p90).toBeLessThan(50) // «algunos», no la mayoría
      expect(calce[1772].max).toBeGreaterThan(50)
    })

    it('el error crece hacia las orillas en los planos de 1889 y 1911', () => {
      const { plaza } = leer('public/datos/ciudad.json').plano
      for (const año of [1889, 1911]) {
        const carpeta = readdirSync(path.join(RAIZ, 'tools/geo/gcp')).find((n) => n.startsWith(`calce-${año}`))
        const gcps = leer(`tools/geo/gcp/${carpeta}`).gcps.filter((g) => Number.isFinite(g.loo_m))
        const media = (lista) => lista.reduce((a, g) => a + g.loo_m, 0) / lista.length
        const lejos = (g) => Math.hypot(g.x36 - plaza[0], g.y36 - plaza[1]) * 0.5 > 1000
        expect(media(gcps.filter(lejos)), String(año)).toBeGreaterThan(media(gcps.filter((g) => !lejos(g))))
      }
    })

    it('«lo de hoy» calza con menos de 10 m en los puntos de control', () => {
      expect(texto).toMatch(/menos de 10 m/)
      expect(leer('tools/geo/gcp/1936-wgs84.json').residuos.max_m).toBeLessThan(10)
    })

    it('el relieve está exagerado lo que dice, y los frentes de los lotes miden lo que dice', () => {
      expect(texto).toMatch(/exagerado 1,3 veces/)
      expect(readFileSync(path.join(RAIZ, 'src/main.js'), 'utf8')).toMatch(/const EXAGERACION = 1\.3\b/)
      expect(texto).toMatch(/de 9 a 14 m de frente/)
      expect(readFileSync(path.join(RAIZ, 'tools/geo/README.md'), 'utf8')).toMatch(/Los frentes van de 9 a 14 m/)
    })

    it('la costura queda donde dice: a poco más de una cuadra al este de la plaza', () => {
      const { costura_m: costura, plaza_m: plaza } = leer('tools/geo/mosaico-1936.json')
      expect(costura - plaza[0]).toBeGreaterThan(100)
      expect(costura - plaza[0]).toBeLessThan(200)
    })
  })
})

describe('bloqueDeEpoca', () => {
  it('reusa el pie de la línea de tiempo y agrega el plano y las casas', () => {
    // Act
    const b = bloqueDeEpoca(EPOCAS[1])
    // Assert
    expect(b).toEqual({ tipo: 'epoca', año: 1772, texto: pieDeEpoca(EPOCAS[1]), titulo: '"Exato mapa"', autor: 'Juan Vicente Bolívar', casas: '1.968 casas en pie en el modelo' })
    expect(b.texto).toBe('La ciudad hacia 1772, según el Exato mapa (1772). El damero ya llena el valle.')
  })

  it('al título del plano base le quita el «hoja 1 de 2», y aguanta una época sin créditos', () => {
    expect(bloqueDeEpoca(EPOCAS[3]).titulo).toBe('Caracas. No. 7')
    expect(bloqueDeEpoca({ año: 1843, corto: 'plano de Jesurún (1843)' })).toMatchObject({ titulo: null, autor: null, casas: null })
  })
})

describe('epocasVisibles', () => {
  it('deja las que se muestran, de `desde` en adelante', () => {
    expect(epocasVisibles(EPOCAS, 1).map((e) => e.año)).toEqual([1772, 1889, 1936])
  })

  it('sin épocas, o con filas rotas, no falla', () => {
    expect(epocasVisibles(null, 1)).toEqual([])
    expect(epocasVisibles([{ año: 1 }, { año: '1772', corto: 'x' }, null, EPOCAS[1]], 0)).toEqual([EPOCAS[1]])
  })
})

describe('bloquesDeFuentes', () => {
  const bloques = bloquesDeFuentes(validarCreditos(CREDITOS))
  const grupo = (titulo) => bloques.find((b) => b.tipo === 'fuentes' && b.titulo.startsWith(titulo))

  it('agrupa: planos, otros datos, fotos (plegadas) y programas', () => {
    expect(bloques.filter((b) => b.tipo === 'fuentes').map((b) => [b.titulo, b.plegado])).toEqual([
      ['Los planos', false], ['Otros datos', false], ['Las fotos de las fichas (1)', true], ['Programas', false],
    ])
  })

  it('cada plano lleva título, autor, institución, para qué se usa, licencia y enlace', () => {
    expect(grupo('Los planos').filas).toEqual([
      {
        cabeza: '1889', titulo: 'Plano topografico', detalle: 'Vicente S. Mestre · BnF', uso: 'Calzado sobre el plano base: de él sale la ciudad de 1889.',
        licencia: 'Dominio público (Wikimedia Commons)', porVerificar: false, url: 'https://commons.wikimedia.org/wiki/File:Mestre.jpg',
      },
      {
        cabeza: '1936', titulo: 'Caracas. No. 7', detalle: 'Dirección de Cartografía Nacional · University of Alberta',
        uso: 'Es el plano base, en 2 hojas: de él salen la hoja, las manzanas y las casas.',
        licencia: SIN_LICENCIA, porVerificar: true, url: 'https://archive.org/details/WCWdb_18053',
      },
    ])
  })

  it('lo que está por verificar se dice con las palabras de los créditos, sin otra licencia al lado', () => {
    const pendiente = grupo('Los planos').filas.find((f) => f.porVerificar)
    expect(pendiente.licencia).toBe('Sin licencia declarada en la fuente; derechos por verificar.')
    expect(textoDe(bloques[0])).toMatch(/Lo marcado «por verificar» tiene los derechos en revisión\./)
    expect(textoDe(bloques[0])).toMatch(/no es una afirmación de que sea libre/)
  })

  it('si nada está por verificar, no lo anuncia', () => {
    const limpio = validarCreditos({ ...CREDITOS, mapas: [CREDITOS.mapas[0]] })
    expect(textoDe(bloquesDeFuentes(limpio)[0])).not.toMatch(/por verificar/)
  })

  it('los datos muestran su atribución; las fotos, autor y fecha; el programa, su licencia', () => {
    expect(grupo('Otros datos').filas[0]).toMatchObject({ titulo: 'Calles de hoy', licencia: 'Open Database License (ODbL) 1.0 · Atribución: © colaboradores de OpenStreetMap' })
    expect(grupo('Las fotos').filas[0]).toMatchObject({ titulo: 'La plaza.', detalle: 'Autor desconocido, 1910', licencia: 'Dominio público', porVerificar: false })
    expect(grupo('Programas').filas[0]).toMatchObject({ titulo: 'three 0.187.0', licencia: 'Licencia MIT', url: 'https://threejs.org/' })
  })

  it('un programa sin licencia declarada lo dice', () => {
    const c = validarCreditos({ programas: [{ nombre: 'x', version: '1.0.0', licencia: null }] })
    expect(bloquesDeFuentes(c).find((b) => b.tipo === 'fuentes').filas[0]).toMatchObject({ licencia: 'Sin licencia declarada en el paquete.', porVerificar: true })
  })

  it('no arma grupos vacíos', () => {
    const c = validarCreditos({ programas: CREDITOS.programas })
    expect(bloquesDeFuentes(c).filter((b) => b.tipo === 'fuentes').map((b) => b.titulo)).toEqual(['Programas'])
  })

  it('sin créditos (la demo de CI) lo dice y manda al repositorio', () => {
    const [aviso, ...resto] = bloquesDeFuentes(null)
    expect(resto).toEqual([])
    expect(aviso.clase).toBe('aviso')
    expect(textoDe(aviso)).toMatch(/no trae la lista de fuentes/)
    expect(aviso.partes).toContainEqual({ texto: 'el repositorio', url: REPOSITORIO })
  })
})

describe('seccionesDeAcerca', () => {
  const secciones = seccionesDeAcerca({ epocas: EPOCAS, desde: 1, creditos: validarCreditos(CREDITOS) })
  const seccion = (id, lista = secciones) => lista.find((s) => s.id === id)

  it('trae las cinco secciones, en orden', () => {
    expect(secciones.map((s) => [s.id, s.titulo])).toEqual([
      ['viendo', 'Qué estás viendo'], ['moverte', 'Cómo moverte'], ['epocas', 'Las épocas'], ['fuentes', 'Fuentes y licencias'], ['creditos', 'Créditos'],
    ])
  })

  it('«Qué estás viendo» nombra los años anteriores al plano base', () => {
    expect(textoDe(seccion('viendo'))).toContain('La ciudad de 1772 y 1889 no está dibujada de nuevo.')
  })

  it('«Cómo moverte» sale de la tabla de controles: todos los atajos, y solo los disponibles', () => {
    const teclas = (lista) => seccion('moverte', lista).bloques[0].grupos.at(-1).filas.map((f) => f.tecla)
    expect(teclas(secciones)).toEqual(ACCIONES.map((a) => a.tecla))
    expect(teclas(seccionesDeAcerca({ acciones: ['color', 'hoy'] }))).toEqual(['C', 'H'])
  })

  it('«Las épocas» tiene un párrafo por año que se muestra, con el texto de la línea de tiempo', () => {
    const bloques = seccion('epocas').bloques
    expect(bloques.filter((b) => b.tipo === 'epoca').map((b) => b.año)).toEqual([1772, 1889, 1936])
    expect(bloques.find((b) => b.año === 1772).texto).toBe(pieDeEpoca(EPOCAS[1]))
    expect(textoDe(bloques[0])).toMatch(/pasa por 3 años\. El último, 1936, es el del plano base/)
  })

  it('sin línea de tiempo ni créditos (la demo de CI) lo dice en cada sección', () => {
    const demo = seccionesDeAcerca({ epocas: null, desde: 1, creditos: null })
    expect(textoDe(seccion('epocas', demo))).toMatch(/no trae la línea de tiempo/)
    expect(textoDe(seccion('fuentes', demo))).toMatch(/no trae la lista de fuentes/)
    expect(demo).toHaveLength(5)
  })

  it('los créditos nombran al autor (con su cuenta de X), la inspiración, a Claude y el repositorio, y a ninguna persona más', () => {
    const creditos = seccion('creditos')
    const texto = textoDe(creditos)
    expect(creditos.bloques[0].partes).toEqual(['Hecho por ', { texto: AUTOR.usuario, url: AUTOR.url }, '.'])
    expect(texto).toContain('@mormonnegro')
    expect(texto).toContain('Claude')
    const enlaces = creditos.bloques.flatMap((b) => b.partes).filter((p) => p.url).map((p) => p.url)
    expect(enlaces).toEqual([AUTOR.url, INSPIRACION, REPOSITORIO])
    expect(texto).not.toMatch(/@(?!mormonnegro|negrunch)\w+|[\w.]+@[\w.]+\.\w+/) // ni otro usuario ni un correo
  })

  it('el autor es @negrunch y su enlace va a su cuenta de X', () => {
    expect(AUTOR).toEqual({ usuario: '@negrunch', url: 'https://x.com/negrunch' })
    expect(Object.isFrozen(AUTOR)).toBe(true)
  })

  it('la firma de la esquina (index.html) es la del autor y abre su cuenta en otra pestaña', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    const firma = html.match(/<a id="firma"[^>]*>[\s\S]*?<\/a>/)?.[0]
    expect(firma).toBeTruthy()
    expect(firma).toContain(`href="${AUTOR.url}"`)
    expect(firma).toContain('target="_blank"')
    expect(firma).toContain('rel="noopener"')
    expect(firma.replace(/<[^>]+>/g, '')).toBe(`Hecho por ${AUTOR.usuario}`)
  })

  it('todos los enlaces del panel son http(s)', () => {
    const urls = [...textoDe(secciones).matchAll(/"url":"([^"]+)"/g)].map((m) => m[1])
    expect(urls.length).toBeGreaterThan(5)
    for (const u of urls) expect(enlaceSeguro(u), u).toBe(new URL(u).href)
  })
})

describe('con los datos del repo', () => {
  const carpetas = (base) => readdirSync(path.join(RAIZ, base), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  const creditos = armarCreditos({
    epocas: leer('tools/geo/epocas/epocas.json').epocas, desde: PRIMERA_EPOCA,
    base: leer('tools/geo/mosaico-1936.json').hojas.map((h) => h.fuente),
    fichasMapas: Object.fromEntries(carpetas('fuentes/mapas').map((id) => [id, leer(`fuentes/mapas/${id}/ficha.json`)])),
    fichasDatos: Object.fromEntries(carpetas('fuentes/datos').map((id) => [id, leer(`fuentes/datos/${id}/ficha.json`)])),
    fotos: [], paquetes: [leer('node_modules/three/package.json')],
  })

  it('lo que escribe el paso de créditos pasa entero por la validación del panel', () => {
    expect(validarCreditos(JSON.parse(JSON.stringify(creditos)))).toEqual(creditos)
  })

  it('el plano de 1936 aparece como plano base y con los derechos por verificar; los demás, con la licencia de su ficha', () => {
    const planos = bloquesDeFuentes(validarCreditos(creditos)).find((b) => b.titulo === 'Los planos').filas
    expect(planos.map((f) => [f.cabeza, f.porVerificar])).toEqual([['1772', false], ['1843', false], ['1889', false], ['1911', false], ['1936', true]])
    expect(planos.at(-1).licencia).toBe(SIN_LICENCIA)
    expect(planos.at(-1).uso).toMatch(/^Es el plano base, en 2 hojas/)
    for (const f of planos) expect(f.url, f.cabeza).toMatch(/^https:\/\//)
  })
})

describe('bloqueDeVersion', () => {
  const HASH = '01cb4ca2f3e4d5c6b7a8901234567890abcdef12'

  it('muestra el commit corto, enlazado a ese commit en el repositorio', () => {
    expect(bloqueDeVersion({ hash: HASH, sucio: false })).toEqual({
      tipo: 'p', clase: 'version', partes: ['Versión: ', { texto: '01cb4ca', url: `${REPOSITORIO}/commit/${HASH}` }, '.'],
    })
  })

  it('avisa cuando la copia tiene cambios sin commit', () => {
    expect(textoDe(bloqueDeVersion({ hash: HASH, sucio: true }))).toContain('con cambios sin commit')
  })

  it('sin un commit válido dice que no se sabe, sin enlace', () => {
    for (const commit of [null, undefined, {}, { hash: 'no-es-hex' }, { hash: 'abc' }]) {
      expect(bloqueDeVersion(commit)).toEqual({ tipo: 'p', clase: 'version', partes: ['Versión: sin datos del commit.'] })
    }
  })

  it('va al final de los créditos', () => {
    const creditos = seccionesDeAcerca({ commit: { hash: HASH, sucio: false } }).find((s) => s.id === 'creditos')
    expect(creditos.bloques.at(-1)).toEqual(bloqueDeVersion({ hash: HASH, sucio: false }))
  })
})
