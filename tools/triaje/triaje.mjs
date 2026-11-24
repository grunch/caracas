/**
 * El bot de triaje del estándar de calidad: busca los hechos de un PR, corre las revisiones de
 * triaje-lib.mjs y pone la etiqueta, un comentario y un check (specs/09-estandar-de-calidad.md § 5).
 *
 * Lo corre .github/workflows/calidad.yml en pull_request_target, desde un checkout de main: nunca baja
 * ni corre código del PR. El título y la descripción salen del payload del evento, como datos; lo demás,
 * de la API. Solo la biblioteca estándar de Node (sin npm ci).
 */
import { readFileSync, appendFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { MARCA, evaluar, comentario, resumen, seccionesDePlantilla, conClavesDeRendimiento } from './triaje-lib.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..', '..')
const LOGIN_DEL_BOT = 'github-actions[bot]'
const NOMBRE_DEL_CHECK = 'Estándar de calidad'
const POR_PAGINA = 100

const ISSUES_QUE_CIERRA = `
query($duenio: String!, $nombre: String!, $numero: Int!) {
  repository(owner: $duenio, name: $nombre) {
    pullRequest(number: $numero) {
      closingIssuesReferences(first: 20) {
        nodes { number repository { nameWithOwner } labels(first: 50) { nodes { name } } }
      }
    }
  }
}`

/** Las pocas llamadas REST y GraphQL que usa el bot. */
export function crearGitHub(repo, token, api = 'https://api.github.com') {
  return {
    repo,
    async pedir(metodo, ruta, cuerpo) {
      const r = await fetch(api + ruta, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(30000),
      })
      if (!r.ok) throw Object.assign(new Error(`${metodo} ${ruta}: HTTP ${r.status}`), { estado: r.status })
      const texto = await r.text()
      return texto ? JSON.parse(texto) : null
    },
    async paginar(ruta) {
      const todo = []
      for (let pagina = 1; ; pagina++) {
        const lote = await this.pedir('GET', `${ruta}${ruta.includes('?') ? '&' : '?'}per_page=${POR_PAGINA}&page=${pagina}`)
        todo.push(...lote)
        if (lote.length < POR_PAGINA) return todo
      }
    },
  }
}

export function prDelEvento(evento) {
  const p = evento.pull_request
  return {
    numero: p.number,
    titulo: p.title ?? '',
    cuerpo: p.body ?? '',
    autor: p.user.login,
    tipoAutor: p.user.type ?? 'User',
    asociacion: p.author_association ?? 'NONE',
    etiquetas: (p.labels ?? []).map((e) => e.name),
    sha: p.head.sha,
    borrador: Boolean(p.draft),
  }
}

export async function hechosDelPR(gh, pr) {
  const base = `/repos/${gh.repo}`
  const archivos = (await gh.paginar(`${base}/pulls/${pr.numero}/files`)).map((f) => ({
    nombre: f.filename, mas: f.additions ?? 0, menos: f.deletions ?? 0, parche: f.patch ?? null, antes: f.previous_filename ?? null,
  }))
  const [duenio, nombre] = gh.repo.split('/')
  const r = await gh.pedir('POST', '/graphql', { query: ISSUES_QUE_CIERRA, variables: { duenio, nombre, numero: pr.numero } })
  if (r.errors?.length) throw new Error(`errores de GraphQL: ${JSON.stringify(r.errors)}`)
  const issues = r.data.repository.pullRequest.closingIssuesReferences.nodes
    .filter((i) => i.repository.nameWithOwner.toLowerCase() === gh.repo.toLowerCase())
    .map((i) => ({ numero: i.number, etiquetas: i.labels.nodes.map((e) => e.name) }))
  const q = encodeURIComponent(`repo:${gh.repo} is:pr is:open author:${pr.autor}`)
  const abiertos = (await gh.pedir('GET', `/search/issues?q=${q}&per_page=1`)).total_count
  return { archivos, issues, otrosPrsAbiertos: Math.max(0, abiertos - 1) }
}

/** Cambia la etiqueta del veredicto, mantiene un solo comentario y deja un check que nunca bloquea. */
export async function aplicarResultado(gh, numero, sha, etiquetasActuales, resultado, cfg) {
  const base = `/repos/${gh.repo}`
  const [poner, sacar] = resultado.ok ? [cfg.etiquetas.ok, cfg.etiquetas.falta_info] : [cfg.etiquetas.falta_info, cfg.etiquetas.ok]
  if (!etiquetasActuales.includes(poner)) await gh.pedir('POST', `${base}/issues/${numero}/labels`, { labels: [poner] })
  // siempre, sin mirar el payload: una vuelta anterior pudo poner la contraria después de que se armó (404: no estaba)
  await gh.pedir('DELETE', `${base}/issues/${numero}/labels/${encodeURIComponent(sacar)}`)
    .catch((e) => { if (e.estado !== 404) throw e })

  const mios = (await gh.paginar(`${base}/issues/${numero}/comments`))
    .filter((c) => c.user.login === LOGIN_DEL_BOT && c.body.startsWith(MARCA))
  if (resultado.ok) {
    for (const c of mios) await gh.pedir('DELETE', `${base}/issues/comments/${c.id}`)
  } else {
    const cuerpo = comentario(resultado, gh.repo)
    if (!mios.length) await gh.pedir('POST', `${base}/issues/${numero}/comments`, { body: cuerpo })
    else if (mios[0].body !== cuerpo) await gh.pedir('PATCH', `${base}/issues/comments/${mios[0].id}`, { body: cuerpo })
  }

  // nunca `failure`: el check informa, no bloquea el merge
  const titulo = resultado.ok ? 'Cumple el estándar' : `${resultado.motivos.length} cosa(s) por arreglar`
  await gh.pedir('POST', `${base}/check-runs`, {
    name: NOMBRE_DEL_CHECK, head_sha: sha, status: 'completed', conclusion: resultado.ok ? 'success' : 'neutral',
    output: { title: titulo, summary: resumen(resultado) },
  }).catch((e) => console.warn(`::warning::no se pudo crear el check: ${e.message}`))
}

/** El triaje del PR del evento; devuelve el informe (o null si es un borrador). `gh`, para los tests. */
export async function principal(env = process.env, gh = crearGitHub(env.GITHUB_REPOSITORY, env.GITHUB_TOKEN)) {
  const pr = prDelEvento(JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')))
  if (pr.borrador) { console.log(`#${pr.numero} es un borrador: se revisa cuando pase a listo.`); return null }
  const presupuesto = JSON.parse(readFileSync(join(RAIZ, 'tools/rendimiento/presupuesto.json'), 'utf8'))
  const cfg = conClavesDeRendimiento(JSON.parse(readFileSync(join(AQUI, 'config.json'), 'utf8')), presupuesto)
  const plantilla = seccionesDePlantilla(readFileSync(join(RAIZ, '.github/pull_request_template.md'), 'utf8'))
  const resultado = evaluar(pr, await hechosDelPR(gh, pr), cfg, plantilla)
  await aplicarResultado(gh, pr.numero, pr.sha, pr.etiquetas, resultado, cfg)
  const informe = `## Triaje de calidad de #${pr.numero}\n\n${resumen(resultado)}\n`
  console.log(informe)
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, informe)
  return informe
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => { console.error(e); process.exit(1) })
}
