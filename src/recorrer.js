/**
 * «Recorrer»: el botón que despliega hacia arriba los modos de recorrido (Caminar, Volar, Manejar), para que la barra
 * de abajo a la derecha ocupe menos pantalla. Se cierra con Esc, tocando afuera o al entrar a un modo (durante un modo
 * el CSS deja a la vista solo el botón del modo, «Volver al mapa»).
 */
export function crearMenuRecorrer({ grupo, boton, documento = globalThis.document }) {
  const abierto = () => grupo.classList.contains('abierto')
  function abrir(si = !abierto()) {
    grupo.classList.toggle('abierto', si)
    boton.setAttribute('aria-expanded', String(si))
  }
  boton.addEventListener('click', () => abrir())
  documento.addEventListener('pointerdown', (e) => { if (abierto() && !grupo.contains(e.target)) abrir(false) })
  documento.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !abierto()) return
    e.stopPropagation()
    abrir(false)
    boton.focus()
  }, true)
  return { abrir, cerrar: () => abrir(false), get abierto() { return abierto() } }
}
