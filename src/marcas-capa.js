/**
 * La capa de las marcas sobre la vista: un botón por lugar (cartel + hilo + punto), ubicado en cada cuadro
 * que dibuja el bucle bajo demanda. Toda la decisión (qué, dónde, con qué nombre) es de src/marcas.js; acá
 * solo se aplica al DOM y se atienden el mouse, el foco y el click. Estilos en src/marcas.css.
 */
import { Matrix4 } from 'three'
import { calcularMarcas } from './marcas.js'

const crear = (etiqueta, clase) => Object.assign(document.createElement(etiqueta), { className: clase })

/**
 * `contenedor`: el <div id="marcas">; `marcas`: las de normalizarMarcas; `tamaño()`: { ancho, alto } de la vista
 * en píxeles CSS; `altura(x, z)`: el suelo tal como se dibuja; `alAbrir(marca, visible)`: click o Enter en un
 * cartel; `alSobre(marca | null)`: el mouse o el foco entran o salen de un cartel.
 */
export function crearCapaMarcas({ contenedor, marcas, tamaño, altura = () => 0, alAbrir = () => {}, alSobre = () => {} }) {
  const elementos = new Map()
  const medidas = new Map()
  const matriz = new Matrix4()
  // un cartel invisible por nivel, para medir cada nombre con su tipografía real (una vez por nombre)
  const reglas = [1, 2, 3].map((nivel) => {
    const raiz = crear('div', `marca n${nivel} regla`)
    raiz.setAttribute('aria-hidden', 'true')
    const cartel = raiz.appendChild(crear('span', 'tag'))
    const texto = cartel.appendChild(document.createElement('b'))
    contenedor.append(raiz)
    return { cartel, texto }
  })
  const estado = { visibles: [], nivel: null, prendida: true, sobre: null, abierta: null }

  /** El cartel cerrado se mide en la regla (una vez por nombre); el abierto, con su nota, en el propio botón. */
  function medir(nombre, nivel, abierta) {
    const boton = abierta ? elementos.get(estado.abierta?.id)?.boton : null
    if (boton?.offsetWidth > 0) return { ancho: boton.offsetWidth, alto: boton.offsetHeight }
    const clave = `${nivel}|${nombre}`
    let m = medidas.get(clave)
    if (!m) {
      const { cartel, texto } = reglas[nivel - 1]
      texto.textContent = nombre
      m = { ancho: cartel.offsetWidth, alto: cartel.offsetHeight }
      if (m.ancho > 0) medidas.set(clave, m) // sin layout todavía (pestaña oculta): se vuelve a medir
    }
    return m
  }

  function ponerSobre(marca) {
    if (estado.sobre === marca) return
    if (estado.sobre) elementos.get(estado.sobre.id)?.raiz.classList.remove('sobre')
    estado.sobre = marca
    if (marca) elementos.get(marca.id)?.raiz.classList.add('sobre')
    contenedor.classList.toggle('velo', Boolean(marca))
    alSobre(marca)
  }

  function ponerAbierta(marca) {
    if (estado.abierta) elementos.get(estado.abierta.id)?.raiz.classList.remove('abierta')
    estado.abierta = marca
    if (marca) elementos.get(marca.id)?.raiz.classList.add('abierta')
  }

  function elementoDe(marca) {
    let e = elementos.get(marca.id)
    if (e) return e
    const raiz = crear('div', `marca n${marca.nivel}`)
    raiz.dataset.id = marca.id
    const boton = Object.assign(crear('button', 'tag'), { type: 'button' })
    const nombre = boton.appendChild(document.createElement('b'))
    const nota = boton.appendChild(document.createElement('i'))
    raiz.append(boton, crear('span', 'hilo'), crear('span', 'punto'))
    boton.addEventListener('pointerenter', () => ponerSobre(marca))
    // el foco del teclado sostiene el velo; el que deja un click del mouse, no
    boton.addEventListener('pointerleave', () => { if (!boton.matches(':focus-visible')) ponerSobre(null) })
    boton.addEventListener('focus', () => { if (boton.matches(':focus-visible')) ponerSobre(marca) })
    boton.addEventListener('blur', () => ponerSobre(null))
    boton.addEventListener('click', () => abrir(marca.id))
    raiz.addEventListener('animationend', () => raiz.classList.remove('nueva'))
    contenedor.append(raiz)
    e = { raiz, boton, nombre, nota, texto: null, ver: false }
    elementos.set(marca.id, e)
    return e
  }

  function ocultar(e, marca) {
    if (!e.ver) return
    e.ver = false
    e.raiz.classList.remove('ver', 'nueva')
    if (estado.sobre === marca) ponerSobre(null)
    if (estado.abierta === marca) ponerAbierta(null)
  }

  /** Ubica las marcas de este cuadro; devuelve las cajas de sus carteles (para que nada se escriba encima). */
  function dibujar({ camera, dist, epoca, sube }) {
    if (!estado.prendida) return []
    matriz.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    const previas = new Set(estado.visibles.map((v) => v.id))
    const { nivel, visibles } = calcularMarcas(marcas, {
      epoca, matriz: matriz.elements, vista: tamaño(), dist, medir, altura, sube, previas, nivelPrevio: estado.nivel, abierta: estado.abierta?.id ?? null,
    })
    const ahora = new Set()
    for (const v of visibles) {
      ahora.add(v.id)
      const e = elementoDe(v.marca)
      if (e.texto !== v.nombre) {
        e.texto = v.nombre
        e.nombre.textContent = v.nombre
        e.nota.textContent = v.nota
        e.raiz.classList.toggle('con-nota', Boolean(v.nota))
      }
      e.raiz.style.transform = `translate(${v.x.toFixed(1)}px,${v.y.toFixed(1)}px)`
      e.raiz.style.setProperty('--o', v.opacidad.toFixed(2))
      if (!e.ver) {
        e.ver = true
        e.raiz.classList.add('ver')
        // la que llega con la ola de su época (todavía a medio aparecer) se anuncia con una onda
        if (v.opacidad < 0.999) e.raiz.classList.add('nueva')
      }
    }
    for (const v of estado.visibles) if (!ahora.has(v.id)) ocultar(elementos.get(v.id), v.marca)
    estado.visibles = visibles
    estado.nivel = nivel
    return visibles.map((v) => v.caja)
  }

  /** Prende o apaga la capa entera. */
  function mostrar(prender) {
    estado.prendida = prender
    contenedor.hidden = !prender
    if (prender) return
    for (const v of estado.visibles) ocultar(elementos.get(v.id), v.marca)
    estado.visibles = []
  }

  /** Abre una marca (como el click en su cartel): muestra su nota y avisa con `alAbrir`. */
  function abrir(id) {
    const marca = marcas.find((m) => m.id === id)
    if (!marca) return false
    const visible = estado.visibles.find((v) => v.id === id) ?? null
    ponerAbierta(estado.abierta === marca ? null : marca)
    alAbrir(marca, visible)
    return true
  }

  return {
    dibujar, mostrar, abrir, marcas,
    get prendida() { return estado.prendida },
    get nivel() { return estado.nivel },
    get sobre() { return estado.sobre?.id ?? null },
    get abierta() { return estado.abierta?.id ?? null },
    /** Lo que se ve en el último cuadro: [{ id, nombre, nivel, x, y, opacidad }]. */
    get visibles() { return estado.visibles.map(({ id, nombre, nivel, x, y, opacidad }) => ({ id, nombre, nivel, x, y, opacidad })) },
  }
}
