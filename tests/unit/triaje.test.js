import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  MARCA, secciones, normalizar, seccionesDePlantilla, pasos, tipoDelPR, codigo, evaluar, comentario,
  revisarIssue, revisarPlantilla, revisarPruebaAMano, revisarCapturas, revisarFuentes, revisarFixConTest,
  revisarPlan, revisarTamano, revisarPrsAbiertos, revisarRendimiento, conClavesDeRendimiento,
} from '../../tools/triaje/triaje-lib.mjs'

const presupuesto = JSON.parse(readFileSync('tools/rendimiento/presupuesto.json', 'utf8'))
const cfg = conClavesDeRendimiento(JSON.parse(readFileSync('tools/triaje/config.json', 'utf8')), presupuesto)
const PLANTILLA_MD = readFileSync('.github/pull_request_template.md', 'utf8')
const plantilla = seccionesDePlantilla(PLANTILLA_MD)

const archivo = (nombre, { mas = 10, menos = 0, parche = '', antes = null } = {}) =>
  ({ nombre, mas, menos, parche, antes })
const hechos = (h = {}) => ({ archivos: [archivo('src/buscador.js')], issues: [], otrosPrsAbiertos: 0, ...h })
const pr = (p = {}) => ({
  numero: 7, titulo: 'feat: algo', cuerpo: '', autor: 'alguien', tipoAutor: 'User', asociacion: 'CONTRIBUTOR',
  etiquetas: [], sha: 'a'.repeat(40), borrador: false, ...p,
})

/** Una descripción que cumple todo; `cambios` reemplaza secciones enteras (## o ###). */
const CUERPO_BUENO = {
  'Issue o tarea': 'Closes #12',
  Tipo: 'feat',
  'Qué cambia y por qué': 'El buscador entiende «esquina de Gradillas».',
  'Qué toca': 'Buscador, todas las épocas. src/buscador.js',
  'Qué más podría romperse': 'Las fichas leen el mismo diccionario; no cambia su formato.',
  Fuentes: 'No aplica: no toca datos históricos.',
  Rendimiento: 'No aplica: no toca la carga, la geometría, los shaders ni las texturas.',
}
const PRUEBA_BUENA = {
  Preparación: 'npm run dev con los datos completos, Chrome 131.',
  Pasos: '1. Escribe «Gradillas a Sociedad» en el buscador.\n   Se ve: la cámara vuela a la esquina.\n2. Regresión: busca «Plaza Bolívar».\n   Se ve: igual que en main.',
  Capturas: 'No aplica: el cambio no se ve.',
  'No cubierto': 'Nominatim.',
}
const cuerpo = (cambios = {}, prueba = {}) => {
  const a = { ...CUERPO_BUENO, ...cambios }
  const p = { ...PRUEBA_BUENA, ...prueba }
  const sub = Object.entries(p).map(([k, v]) => `### ${k}\n\n${v}`).join('\n\n')
  return [
    ...Object.entries(a).map(([k, v]) => `## ${k}\n\n${v}`),
    `## Prueba a mano\n\n${sub}`,
    '## Tests automáticos\n\ntests/unit/buscador.test.js: 4 casos. Tests 1400 passed.',
    '## Checklist\n\n- [x] todo',
    '## Asistencia de IA\n\nClaude escribió el primer borrador.',
  ].join('\n\n')
}

describe('markdown de la descripción', () => {
  it('parte en secciones ## sin confundir los títulos dentro de bloques de código', () => {
    const s = secciones('## Uno\na\n```md\n## Falso\n```\n## Dos\nb')
    expect(Object.keys(s)).toEqual(['Uno', 'Dos'])
    expect(s.Uno).toContain('## Falso')
  })
  it('se queda con la primera sección si un título se repite', () => {
    expect(secciones('## A\nuno\n## A\ndos').A.trim()).toBe('uno')
  })
  it('normaliza quitando comentarios HTML y líneas vacías', () => {
    expect(normalizar('<!-- nota\nlarga -->\n\n  hola  \n\n')).toBe('hola')
  })
  it('lee la plantilla del repo con todas sus secciones', () => {
    expect(Object.keys(plantilla)).toEqual([
      'Issue o tarea', 'Tipo', 'Qué cambia y por qué', 'Qué toca', 'Qué más podría romperse', 'Fuentes',
      'Rendimiento', 'Prueba a mano', 'Tests automáticos', 'Checklist', 'Asistencia de IA',
    ])
  })
  it('junta cada paso numerado con sus líneas de continuación', () => {
    expect(pasos('1. uno\n   Se ve: x\n2) dos')).toEqual(['1. uno\nSe ve: x', '2) dos'])
  })
  it('toma el tipo de la sección Tipo y, si falta, del prefijo del título', () => {
    expect(tipoDelPR({ Tipo: '`fix`' }, 'feat: x')).toBe('fix')
    expect(tipoDelPR({ Tipo: '<!-- -->' }, 'fix(camara): x')).toBe('fix')
    expect(tipoDelPR({}, 'Arreglo cosas')).toBe(null)
  })
  it('encierra el texto ajeno en un código del que no puede escapar', () => {
    expect(codigo('a`b\n@c')).toBe("`a'b'@c`")
    expect(codigo('x'.repeat(50), 10)).toBe('`xxxxxxxxx…`')
  })
})

describe('revisiones', () => {
  it('issue: pide un issue enlazado con la etiqueta de aceptado', () => {
    expect(revisarIssue({ issues: [{ numero: 1, etiquetas: ['bug'] }] }, cfg).paso).toBe(false)
    expect(revisarIssue({ issues: [{ numero: 1, etiquetas: ['estado: aceptado'] }] }, cfg).paso).toBe(true)
  })
  it('plantilla: una sección ausente o con solo su comentario no cuenta', () => {
    const r = revisarPlantilla(secciones(cuerpo({ Fuentes: '<!-- Cada dato histórico nuevo o corregido -->' })), {
      ...plantilla, Fuentes: normalizar('<!-- Cada dato histórico nuevo o corregido -->'),
    })
    expect(r.paso).toBe(false)
    expect(r.motivos[0]).toContain('Fuentes')
    expect(revisarPlantilla(secciones(cuerpo()), plantilla).paso).toBe(true)
  })
  it('plantilla: «Closes #» sin número es el texto de la plantilla, no un enlace', () => {
    const r = revisarPlantilla(secciones(cuerpo({ 'Issue o tarea': 'Closes #' })), plantilla)
    expect(r.motivos.join()).toContain('Issue o tarea')
  })
  it('prueba a mano: dos pasos con «Se ve:» y uno de regresión', () => {
    expect(revisarPruebaAMano(secciones(cuerpo()), false).paso).toBe(true)
    const sinSeVe = revisarPruebaAMano(secciones(cuerpo({}, { Pasos: '1. a\n2. Regresión: b\n   Se ve: c' })), false)
    expect(sinSeVe.motivos).toEqual(['Prueba a mano: el paso 1 no tiene una línea `Se ve:`'])
    const uno = revisarPruebaAMano(secciones(cuerpo({}, { Pasos: '1. a\n   Se ve: b' })), false)
    expect(uno.motivos.join('\n')).toMatch(/al menos 2 pasos[\s\S]*regresión/)
  })
  it('prueba a mano: un fix necesita un paso que falle en main', () => {
    const r = revisarPruebaAMano(secciones(cuerpo()), true)
    expect(r.motivos).toEqual(['Prueba a mano: ningún paso está marcado `(falla en main)`'])
    const pasosFix = '1. Abre 1772 en color.\n   Se ve: el alero no entra en la calle. **(falla en main)**\n2. Regresión: 1874.\n   Se ve: igual.'
    expect(revisarPruebaAMano(secciones(cuerpo({}, { Pasos: pasosFix })), true).paso).toBe(true)
  })
  it('capturas: si el diff toca algo que se ve, pide antes y después (dos imágenes), sea fix o no', () => {
    const visual = [archivo('src/shader/valle.js')]
    const s = secciones(cuerpo())
    expect(revisarCapturas(s, [archivo('src/buscador.js')], cfg).paso).toBe(true)
    expect(revisarCapturas(s, visual, cfg).paso).toBe(false)
    const una = secciones(cuerpo({}, { Capturas: '![después](https://github.com/user-attachments/assets/1)' }))
    expect(revisarCapturas(una, visual, cfg).motivos).toEqual([
      'Capturas: el PR cambia lo que se ve; lleva captura de antes (main) y de después (esta rama), misma vista y época (trae 1)',
    ])
    const dos = secciones(cuerpo({}, { Capturas: '<img src="https://x/a.png"> <img src="https://x/b.png">' }))
    expect(revisarCapturas(dos, visual, cfg).paso).toBe(true)
  })
  it('capturas: las rutas visuales incluyen los .css y las páginas', () => {
    const s = secciones(cuerpo())
    expect(revisarCapturas(s, [archivo('src/fichas.css')], cfg).paso).toBe(false)
    expect(revisarCapturas(s, [archivo('index.html')], cfg).paso).toBe(false)
  })
  it('capturas: el pipeline que genera la geometría también se ve; sus tests no', () => {
    const s = secciones(cuerpo())
    expect(revisarCapturas(s, [archivo('tools/geo/alas.py')], cfg).paso).toBe(false)
    expect(revisarCapturas(s, [archivo('tools/suelo-lib.mjs')], cfg).paso).toBe(false)
    expect(revisarCapturas(s, [archivo('tools/geo/tests/test_alas.py')], cfg).paso).toBe(true)
    expect(revisarCapturas(s, [archivo('tools/triaje/triaje.mjs')], cfg).paso).toBe(true)
  })
  it('capturas: los scripts de auditoría de tools/geo (informes, no generan nada que se vea) no piden capturas', () => {
    const s = secciones(cuerpo())
    expect(revisarCapturas(s, [archivo('tools/geo/censo_fase8.py')], cfg).paso).toBe(true)
    expect(revisarCapturas(s, [archivo('tools/geo/cierre_fase6.py')], cfg).paso).toBe(true)
    expect(revisarCapturas(s, [archivo('tools/geo/auditar_huellas.py')], cfg).paso).toBe(true)
    // los cierres que importa el generador (epocas.py usa cierre_fase3, 4 y 5) sí
    expect(revisarCapturas(s, [archivo('tools/geo/cierre_fase5.py')], cfg).paso).toBe(false)
    // un PR que además toca el generador sigue pidiéndolas
    expect(revisarCapturas(s, [archivo('tools/geo/censo_fase8.py'), archivo('tools/geo/epocas.py')], cfg).paso).toBe(false)
  })
  it('fuentes: si el diff toca datos históricos, pide al menos un enlace', () => {
    const datos = [archivo('src/marcas-datos.js')]
    expect(revisarFuentes(secciones(cuerpo()), datos, cfg).paso).toBe(false)
    const conEnlace = secciones(cuerpo({ Fuentes: 'Wikipedia: https://es.wikipedia.org/wiki/Palacio_arzobispal_de_Caracas' }))
    expect(revisarFuentes(conEnlace, datos, cfg).paso).toBe(true)
    expect(revisarFuentes(secciones(cuerpo()), [archivo('fuentes/imagenes/2024-x/ficha.json')], cfg).paso).toBe(false)
  })
  it('rendimiento: lo que no toca la carga, la geometría, los shaders ni las texturas no pide medición', () => {
    const s = secciones(cuerpo())
    expect(revisarRendimiento(s, [archivo('src/buscador.js')], cfg).paso).toBe(true)
    expect(revisarRendimiento(s, [archivo('src/fichas.css')], cfg).paso).toBe(true)
    expect(revisarRendimiento(s, [archivo('tests/unit/casas.test.js')], cfg).paso).toBe(true)
  })
  it('rendimiento: si el diff toca lo que cuesta, pide la medición de main y la de esta rama', () => {
    const s = secciones(cuerpo())
    for (const nombre of ['src/shader/fachada.js', 'src/ciudad-trabajador.js', 'src/hitos/panteon-modelo.js',
      'src/hitos-pedido.js', 'src/sw.js', 'src/temprano.js', 'src/plano-niveles.js', 'tools/empacar-ciudad.mjs', 'vite.config.js']) {
      expect(revisarRendimiento(s, [archivo(nombre)], cfg).motivos).toEqual([
        'Rendimiento: el PR toca la carga, la geometría, los shaders o las texturas; pega la medición de `main` y la de esta rama (`tests/e2e/medir-rendimiento.mjs`)',
      ])
    }
  })
  it('rendimiento: la medición nombra un tope del presupuesto y dice cuál es la de main', () => {
    const shader = [archivo('src/shader/fachada.js')]
    const sinMain = secciones(cuerpo({ Rendimiento: 'casasMs: 5600 (tope 5000) · NO PASA' }))
    expect(revisarRendimiento(sinMain, shader, cfg).paso).toBe(false)
    const sinTope = secciones(cuerpo({ Rendimiento: 'Igual que en main, lo miré con ?medir.' }))
    expect(revisarRendimiento(sinTope, shader, cfg).paso).toBe(false)
    const informe = secciones(cuerpo({ Rendimiento: [
      'En `main`:', '```', 'casasMs: 5700 (tope 5000) · NO PASA', 'msPorCuadroCentro: — (tope 16.6) · sin medir', '```',
      'En esta rama:', '```', 'casasMs: 5650 (tope 5000) · NO PASA', '```',
    ].join('\n') }))
    expect(revisarRendimiento(informe, shader, cfg).paso).toBe(true)
    const tabla = secciones(cuerpo({ Rendimiento: '| tope | main | esta rama |\n|---|---|---|\n| `triangulosCentro` | 4,4 M | 4,5 M |' }))
    expect(revisarRendimiento(tabla, [archivo('src/hitos/panteon.js')], cfg).paso).toBe(true)
  })
  it('rendimiento: «main» tiene que ser la palabra, no parte de otra', () => {
    const r = secciones(cuerpo({ Rendimiento: 'mainframe: casasMs 5600' }))
    expect(revisarRendimiento(r, [archivo('src/casas.js')], cfg).paso).toBe(false)
  })
  it('rendimiento: las claves salen del presupuesto, no de una lista aparte', () => {
    expect(cfg.claves_rendimiento).toEqual(Object.keys(presupuesto.topes))
    expect(conClavesDeRendimiento({ a: 1 }, {}).claves_rendimiento).toEqual([])
  })
  it('fix con test: un fix agrega un it()/test() en tests/ o un def test_ en tools/geo/tests', () => {
    const js = archivo('tests/unit/camara.test.js', { parche: "@@\n+  it('no se aleja de más', () => {" })
    const py = archivo('tools/geo/tests/test_relieve.py', { parche: '@@\n+def test_borde():' })
    const otro = archivo('src/camara.js', { parche: "@@\n+  it('no es test')" })
    expect(revisarFixConTest([otro], false).paso).toBe(true)
    expect(revisarFixConTest([otro], true).paso).toBe(false)
    expect(revisarFixConTest([otro, js], true).paso).toBe(true)
    expect(revisarFixConTest([py], true).paso).toBe(true)
    // GitHub omite el parche de un archivo grande: no se puede descartar un test ahí
    expect(revisarFixConTest([archivo('tests/unit/x.test.js', { parche: null })], true).paso).toBe(true)
  })
  it('plan: si nombra una tarea, el diff actualiza su fila', () => {
    const s = secciones(cuerpo({ 'Issue o tarea': 'Closes #12\nTarea: T33j.6f' }))
    expect(revisarPlan(s, [archivo('src/techos.js')], cfg).paso).toBe(false)
    expect(revisarPlan(s, [archivo('src/techos.js'), archivo('specs/07-plan-de-implementacion.md')], cfg).paso).toBe(true)
    expect(revisarPlan(secciones(cuerpo()), [archivo('src/techos.js')], cfg).paso).toBe(true)
  })
  it('tamaño: 3000 líneas de código como máximo, sin tests, specs ni markdown', () => {
    const grande = [archivo('src/a.js', { mas: 2000 }), archivo('src/b.js', { mas: 900, menos: 200 })]
    expect(revisarTamano(grande, false, cfg).motivos[0]).toContain('3100')
    const sinContar = [archivo('src/a.js', { mas: 2900 }), archivo('tests/unit/a.test.js', { mas: 5000 }),
      archivo('specs/07-plan-de-implementacion.md', { mas: 300 }), archivo('README.md', { mas: 300 })]
    expect(revisarTamano(sinContar, false, cfg).paso).toBe(true)
  })
  it('tamaño: un primer PR tiene hasta 400 líneas', () => {
    expect(revisarTamano([archivo('src/a.js', { mas: 401 })], true, cfg).paso).toBe(false)
    expect(revisarTamano([archivo('src/a.js', { mas: 400 })], true, cfg).paso).toBe(true)
  })
  it('PRs abiertos: quien llega por primera vez tiene uno más a la vez', () => {
    expect(revisarPrsAbiertos(2, true, cfg).paso).toBe(false)
    expect(revisarPrsAbiertos(1, true, cfg).paso).toBe(true)
    expect(revisarPrsAbiertos(9, false, cfg).paso).toBe(true)
  })
})

describe('evaluar', () => {
  const issueAceptado = { issues: [{ numero: 12, etiquetas: ['estado: aceptado'] }] }

  it('un PR completo pasa todo', () => {
    const r = evaluar(pr({ cuerpo: cuerpo() }), hechos(issueAceptado), cfg, plantilla)
    expect(r.motivos).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.exento).toBe(null)
  })
  it('una descripción vacía junta todos los motivos', () => {
    const r = evaluar(pr(), hechos(), cfg, plantilla)
    expect(r.ok).toBe(false)
    expect(r.motivos).toContain('No hay un issue aceptado enlazado')
    expect(r.motivos.some((m) => m.includes('Prueba a mano'))).toBe(true)
  })
  it('a quien mantiene el repo no le pide issue, pero sí la plantilla y la prueba a mano', () => {
    const r = evaluar(pr({ asociacion: 'OWNER' }), hechos(), cfg, plantilla)
    expect(r.revisiones.find((c) => c.nombre === 'issue').omitida).toBe(true)
    expect(r.revisiones.find((c) => c.nombre === 'plantilla').paso).toBe(false)
  })
  it('un bot se salta todo', () => {
    const r = evaluar(pr({ autor: 'dependabot[bot]', tipoAutor: 'Bot' }), hechos(), cfg, plantilla)
    expect(r.ok).toBe(true)
    expect(r.exento).toBe('bot')
  })
  it('un PR solo de markdown se salta el contenido, salvo las fuentes', () => {
    const r = evaluar(pr(), hechos({ archivos: [archivo('fuentes/imagenes/README.md')] }), cfg, plantilla)
    expect(r.exento).toBe('solo markdown')
    expect(r.motivos).toEqual(['Fuentes: el PR toca datos históricos y no enlaza ninguna fuente'])
  })
  it('renombrar código a .md no es «solo markdown»', () => {
    const r = evaluar(pr(), hechos({ archivos: [archivo('notas.md', { antes: 'src/a.js' })] }), cfg, plantilla)
    expect(r.exento).toBe(null)
  })
  it('un PR que toca un shader sin medir junta el motivo de rendimiento; la etiqueta de exento lo salta', () => {
    const shader = hechos({ ...issueAceptado, archivos: [archivo('src/shader/fachada.js')] })
    const conCapturas = cuerpo({}, { Capturas: '![antes](https://x/a.png) ![después](https://x/b.png)' })
    const r = evaluar(pr({ cuerpo: conCapturas }), shader, cfg, plantilla)
    expect(r.motivos).toEqual([expect.stringContaining('Rendimiento:')])
    const exento = evaluar(pr({ cuerpo: conCapturas, etiquetas: ['calidad:exento'] }), shader, cfg, plantilla)
    expect(exento.revisiones.find((c) => c.nombre === 'rendimiento').omitida).toBe(true)
  })
  it('la etiqueta de exento salta el contenido pero no el tamaño', () => {
    const r = evaluar(pr({ etiquetas: ['calidad:exento'] }), hechos({ archivos: [archivo('src/a.js', { mas: 3001 })] }), cfg, plantilla)
    expect(r.exento).toBe('etiqueta calidad:exento')
    expect(r.motivos).toHaveLength(1)
    expect(r.motivos[0]).toContain('3001')
  })
  it('la etiqueta de exento manda sobre «solo markdown»: también salta las fuentes', () => {
    const r = evaluar(pr({ etiquetas: ['calidad:exento'] }), hechos({ archivos: [archivo('fuentes/imagenes/README.md')] }), cfg, plantilla)
    expect(r.exento).toBe('etiqueta calidad:exento')
    expect(r.motivos).toEqual([])
    expect(r.ok).toBe(true)
  })
  it('solo lee los primeros bytes de la descripción', () => {
    const r = evaluar(pr({ cuerpo: cuerpo() + 'x'.repeat(70000) }), hechos(issueAceptado), cfg, plantilla)
    expect(r.ok).toBe(true)
  })
})

describe('comentario', () => {
  it('empieza con la marca, enlaza el estándar y lista los motivos', () => {
    const r = evaluar(pr(), hechos(), cfg, plantilla)
    const c = comentario(r, 'grunch/caracas')
    expect(c.startsWith(MARCA)).toBe(true)
    expect(c).toContain('https://github.com/grunch/caracas/blob/main/CONTRIBUTING.md#el-estándar-de-calidad')
    expect(c).toContain('- No hay un issue aceptado enlazado')
    expect(c).toContain('no se cierra nada')
  })
})
