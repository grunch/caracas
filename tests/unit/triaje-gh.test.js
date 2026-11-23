import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crearGitHub, prDelEvento, hechosDelPR, aplicarResultado, principal } from '../../tools/triaje/triaje.mjs'
import { MARCA } from '../../tools/triaje/triaje-lib.mjs'

const cfg = JSON.parse(readFileSync('tools/triaje/config.json', 'utf8'))

/** Un GitHub falso: responde por ruta y anota cada llamada. */
function ghFalso(respuestas = {}, comentarios = []) {
  const llamadas = []
  return {
    repo: 'grunch/caracas',
    llamadas,
    async pedir(metodo, ruta, cuerpo) {
      llamadas.push([metodo, ruta, cuerpo])
      if (metodo === 'GET' && ruta.includes('/comments')) return comentarios
      for (const [patron, r] of Object.entries(respuestas)) if (ruta.includes(patron)) return r
      return null
    },
    async paginar(ruta) { return this.pedir('GET', ruta) },
  }
}

describe('prDelEvento', () => {
  it('saca del payload lo que usan las revisiones', () => {
    const p = prDelEvento({ pull_request: {
      number: 9, title: 'fix: x', body: null, user: { login: 'ana', type: 'User' }, author_association: 'NONE',
      labels: [{ name: 'bug' }], head: { sha: 'b'.repeat(40) }, draft: true,
    } })
    expect(p).toEqual({ numero: 9, titulo: 'fix: x', cuerpo: '', autor: 'ana', tipoAutor: 'User', asociacion: 'NONE',
      etiquetas: ['bug'], sha: 'b'.repeat(40), borrador: true })
  })
})

describe('hechosDelPR', () => {
  it('junta archivos, issues que cierra (solo de este repo) y los otros PRs abiertos del autor', async () => {
    const gh = ghFalso({
      '/files': [{ filename: 'src/a.js', additions: 3, deletions: 1, patch: '+x', previous_filename: 'src/b.js' }],
      '/graphql': { data: { repository: { pullRequest: { closingIssuesReferences: { nodes: [
        { number: 4, repository: { nameWithOwner: 'grunch/caracas' }, labels: { nodes: [{ name: 'estado: aceptado' }] } },
        { number: 5, repository: { nameWithOwner: 'otro/repo' }, labels: { nodes: [{ name: 'estado: aceptado' }] } },
      ] } } } } },
      '/search/issues': { total_count: 3 },
    })
    const h = await hechosDelPR(gh, { numero: 9, autor: 'ana' })
    expect(h).toEqual({
      archivos: [{ nombre: 'src/a.js', mas: 3, menos: 1, parche: '+x', antes: 'src/b.js' }],
      issues: [{ numero: 4, etiquetas: ['estado: aceptado'] }],
      otrosPrsAbiertos: 2,
    })
  })
  it('falla si GraphQL devuelve errores', async () => {
    const gh = ghFalso({ '/files': [], '/graphql': { errors: [{ message: 'no' }] } })
    await expect(hechosDelPR(gh, { numero: 1, autor: 'a' })).rejects.toThrow(/GraphQL/)
  })
})

describe('aplicarResultado', () => {
  const malo = { ok: false, motivos: ['No hay un issue aceptado enlazado'], revisiones: [], exento: null }
  const bueno = { ok: true, motivos: [], revisiones: [], exento: null }
  const sha = 'c'.repeat(40)

  it('si falta algo: etiqueta de falta-info, quita la de ok y deja un comentario', async () => {
    const gh = ghFalso()
    await aplicarResultado(gh, 9, sha, ['calidad:ok'], malo, cfg)
    const metodos = gh.llamadas.map(([m, r, c]) => [m, r.replace('/repos/grunch/caracas', ''), c?.labels ?? c?.conclusion])
    expect(metodos).toContainEqual(['POST', '/issues/9/labels', ['calidad:falta-info']])
    expect(metodos).toContainEqual(['DELETE', '/issues/9/labels/calidad%3Aok', undefined])
    const nuevo = gh.llamadas.find(([m, r]) => m === 'POST' && r.endsWith('/issues/9/comments'))
    expect(nuevo[2].body.startsWith(MARCA)).toBe(true)
    // el check informa, nunca bloquea
    expect(metodos).toContainEqual(['POST', '/check-runs', 'neutral'])
  })
  it('borra siempre la etiqueta contraria, aunque el payload no la traiga (otra vuelta la pudo poner); un 404 no rompe', async () => {
    const gh = ghFalso()
    const pedir = gh.pedir.bind(gh)
    gh.pedir = async (m, r, c) => {
      const res = await pedir(m, r, c)
      if (m === 'DELETE' && r.includes('/labels/')) throw Object.assign(new Error('HTTP 404'), { estado: 404 })
      return res
    }
    await aplicarResultado(gh, 9, sha, [], bueno, cfg)
    expect(gh.llamadas).toContainEqual(['DELETE', '/repos/grunch/caracas/issues/9/labels/calidad%3Afalta-info', undefined])
  })
  it('edita su comentario en vez de duplicarlo', async () => {
    const gh = ghFalso({}, [{ id: 77, user: { login: 'github-actions[bot]' }, body: `${MARCA}\nviejo` }])
    await aplicarResultado(gh, 9, sha, ['calidad:falta-info'], malo, cfg)
    expect(gh.llamadas.some(([m, r]) => m === 'PATCH' && r.endsWith('/issues/comments/77'))).toBe(true)
    expect(gh.llamadas.some(([m, r]) => m === 'POST' && r.endsWith('/comments'))).toBe(false)
    expect(gh.llamadas.some(([m, r]) => m === 'POST' && r.endsWith('/labels'))).toBe(false)
  })
  it('cuando todo pasa: etiqueta de ok y borra su comentario (no los de otros)', async () => {
    const gh = ghFalso({}, [
      { id: 77, user: { login: 'github-actions[bot]' }, body: `${MARCA}\nviejo` },
      { id: 78, user: { login: 'ana' }, body: `${MARCA} copiado` },
    ])
    await aplicarResultado(gh, 9, sha, [], bueno, cfg)
    const borrados = gh.llamadas.filter(([m, r]) => m === 'DELETE' && r.includes('/comments/')).map(([, r]) => r)
    expect(borrados).toEqual(['/repos/grunch/caracas/issues/comments/77'])
    expect(gh.llamadas).toContainEqual(['POST', '/repos/grunch/caracas/issues/9/labels', { labels: ['calidad:ok'] }])
  })
})

describe('crearGitHub', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('pide con el token, pagina de a 100 y lanza con el estado HTTP', async () => {
    const pedidos = []
    const paginas = [Array.from({ length: 100 }, (_, i) => i), [100, 101]]
    vi.stubGlobal('fetch', async (url, op) => {
      pedidos.push([url, op])
      if (url.includes('/falla')) return { ok: false, status: 404, text: async () => '' }
      if (url.includes('/vacio')) return { ok: true, text: async () => '' }
      return { ok: true, text: async () => JSON.stringify(paginas[pedidos.length - 1]) }
    })
    const gh = crearGitHub('grunch/caracas', 'TOKEN', 'https://api.test')
    expect(await gh.paginar('/repos/x/pulls/1/files')).toHaveLength(102)
    expect(pedidos[0][0]).toBe('https://api.test/repos/x/pulls/1/files?per_page=100&page=1')
    expect(pedidos[1][0]).toContain('page=2')
    expect(pedidos[0][1].headers.Authorization).toBe('Bearer TOKEN')
    expect(await gh.pedir('DELETE', '/vacio')).toBe(null)
    await expect(gh.pedir('GET', '/falla')).rejects.toMatchObject({ estado: 404 })
  })
})

describe('principal', () => {
  const evento = (extra = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'triaje-'))
    const ruta = join(dir, 'evento.json')
    writeFileSync(ruta, JSON.stringify({ pull_request: {
      number: 3, title: 'docs: x', body: '', user: { login: 'ana', type: 'User' }, author_association: 'OWNER',
      labels: [], head: { sha: 'd'.repeat(40) }, ...extra,
    } }))
    return { GITHUB_EVENT_PATH: ruta, GITHUB_STEP_SUMMARY: join(dir, 'resumen.md') }
  }

  it('no revisa un borrador', async () => {
    const gh = ghFalso()
    expect(await principal(evento({ draft: true }), gh)).toBe(null)
    expect(gh.llamadas).toEqual([])
  })
  it('revisa el PR del evento con la plantilla y la configuración de main, y escribe el resumen', async () => {
    const gh = ghFalso({
      '/files': [{ filename: 'README.md', additions: 1, deletions: 0, patch: '+x' }],
      '/graphql': { data: { repository: { pullRequest: { closingIssuesReferences: { nodes: [] } } } } },
      '/search/issues': { total_count: 1 },
    })
    const env = evento()
    const informe = await principal(env, gh)
    expect(informe).toContain('Triaje de calidad de #3')
    expect(informe).toContain('Contenido omitido: solo markdown.')
    expect(readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8')).toBe(informe)
    expect(gh.llamadas).toContainEqual(['POST', '/repos/grunch/caracas/issues/3/labels', { labels: ['calidad:ok'] }])
  })
})
