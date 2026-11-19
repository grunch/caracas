/**
 * «Caracas, edificio por edificio» (edificios.html, T71): la lista de los edificios modelados y, al lado, el visor
 * como vitrina (src/vitrina.js). Al leer un edificio, el visor pasa a su año, levanta la ciudad y vuela hasta él.
 */
import { MARCAS } from './marcas-datos.js'
import { FICHAS } from './fichas-datos.js'
import { HITOS } from './hitos.js'
import { normalizarMarcas } from './marcas.js'
import { seccionesDeEdificios } from './vitrina.js'

const lista = document.getElementById('edificios')
const vitrina = document.getElementById('vitrina')
// las posiciones no importan acá: solo los nombres, las épocas y el orden
const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords: { aMundo: (x, y) => ({ x, z: y }) } })
const secciones = seccionesDeEdificios(marcas, FICHAS)

for (const s of secciones) {
  const li = document.createElement('li')
  li.dataset.id = s.id
  const año = Object.assign(document.createElement('span'), { className: 'año', textContent: `Desde ${s.año}` })
  const titulo = Object.assign(document.createElement('h2'), { textContent: s.nombre })
  li.append(año, titulo)
  if (s.antes) li.append(Object.assign(document.createElement('p'), { className: 'antes', textContent: `Antes, ${s.antes}.` }))
  if (s.texto) li.append(Object.assign(document.createElement('p'), { textContent: s.texto }))
  lista.append(li)
}

let visorListo = false
let pendiente = null
const mandar = (vitrinaOrden) => vitrina.contentWindow?.postMessage({ vitrina: vitrinaOrden }, location.origin)
function mostrar(s) {
  for (const li of lista.children) li.classList.toggle('activo', li.dataset.id === s.id)
  if (!visorListo) { pendiente = s; return }
  mandar({ epoca: s.epoca })
  mandar({ levantar: true })
  mandar({ ir: s.id })
}

// el visor avisa cuando está listo; recién ahí recibe órdenes
addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.source !== vitrina.contentWindow || e.data?.vitrina !== 'lista') return
  visorListo = true
  mostrar(pendiente ?? secciones[0])
})

// el edificio que se lee: el que cruza la franja del medio de la ventana
const porId = new Map(secciones.map((s) => [s.id, s]))
const observador = new IntersectionObserver((entradas) => {
  const visible = entradas.find((e) => e.isIntersecting)
  if (visible) mostrar(porId.get(visible.target.dataset.id))
}, { rootMargin: '-45% 0px -45% 0px' })
for (const li of lista.children) observador.observe(li)
window.lab = { secciones, get visorListo() { return visorListo } }
