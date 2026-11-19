/**
 * Todos los controles del visor en una sola tabla: de acá salen los atajos de teclado que atiende
 * src/main.js (`accionDeTecla`) y la sección «Cómo moverte» del panel «Acerca» (`controlesVisibles`). Un
 * atajo que no esté en `ACCIONES` no existe, y uno que esté sale solo en la ayuda: no pueden desfasarse.
 */

/**
 * Lo que se hace con una tecla o con un botón. `codigo`: la tecla física (`KeyboardEvent.code`); `letra`: el
 * carácter (`KeyboardEvent.key`), para los signos que cambian de lugar según el teclado. `conFoco`: también
 * vale con el foco en un botón o un enlace (Espacio y las letras, no: ahí activan o no molestan).
 */
export const ACCIONES = Object.freeze([
  { id: 'levantar', tecla: 'Espacio', codigo: 'Space', boton: '«Levantar la ciudad» / «Acostar la ciudad»', que: 'levanta la ciudad desde el plano, o la vuelve a acostar' },
  { id: 'color', tecla: 'C', codigo: 'KeyC', boton: '«Color» / «Tinta»', que: 'pasa del grabado a tinta al color, y vuelve' },
  { id: 'hoy', tecla: 'H', codigo: 'KeyH', boton: '«Ver lo de hoy»', que: 'estampa en rojo las calles, las vías y las quebradas de hoy, con sus nombres al acercarte' },
  { id: 'nombres', tecla: 'M', codigo: 'KeyM', boton: '«Nombres»', que: 'muestra u oculta los nombres de los lugares' },
  { id: 'plano', tecla: 'P', codigo: 'KeyP', boton: '«Ver el plano de…»', que: 'abre aparte el plano del año elegido, para mirarlo entero' },
  { id: 'buscar', tecla: '/', letra: '/', conFoco: true, boton: 'El buscador', que: 'busca una esquina («de La Torre a Veroes»), un lugar o una dirección de hoy' },
  { id: 'acerca', tecla: '? o F1', letra: '?', codigo: 'F1', conFoco: true, boton: '«?»', que: 'abre esta ayuda' },
].map(Object.freeze))

/** Con el ratón, sobre la vista (src/camara.js). */
export const CON_RATON = Object.freeze([
  { como: 'Arrastrar', que: 'mueve el plano' },
  { como: 'Rueda', que: 'acerca o aleja, hacia donde está el cursor' },
  { como: 'Botón derecho y arrastrar', que: 'gira e inclina la vista' },
].map(Object.freeze))

/** Con los dedos (src/camara.js): por ahora, solo mover. */
export const CON_DEDOS = Object.freeze([
  { como: 'Arrastrar con un dedo', que: 'mueve el plano' },
  { como: 'Tocar un nombre', que: 'lleva al lugar y abre su ficha' },
].map(Object.freeze))

/** Lo que está en pantalla y no tiene tecla: la línea de tiempo, los nombres y las fichas. */
export const EN_PANTALLA = Object.freeze([
  { como: 'Los años, arriba', que: 'llevan la ciudad a ese año: la época llega como una ola desde la Plaza Bolívar' },
  { como: '▶', que: 'recorre los años solo, del primero al último; tocarlo otra vez lo detiene' },
  { como: 'Un nombre', que: 'la vista vuela al lugar y se abre su ficha, con el texto de cada época y sus fotos' },
].map(Object.freeze))

const EN_CAMPO = 'input, textarea, select, [contenteditable]'
const EN_BOTON = 'button, a, [role="button"]'

/**
 * La acción que pide un `keydown`, o null. No hay atajos mientras se escribe en un campo, con Ctrl, Alt o
 * Meta, ni con la tecla sostenida; con el foco en un botón o un enlace solo valen los `conFoco`.
 * `ids`: las acciones que hoy tienen quien las atienda (las demás se ignoran).
 */
export function accionDeTecla(e, ids = null) {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return null
  if (e.target?.closest?.(EN_CAMPO)) return null
  const accion = ACCIONES.find((a) => (a.codigo && a.codigo === e.code) || (a.letra && a.letra === e.key))
  if (!accion || (ids && !ids.includes(accion.id))) return null
  if (!accion.conFoco && e.target?.closest?.(EN_BOTON)) return null
  return accion
}

/**
 * La ayuda de controles, por grupos: `[{ titulo, tactil?, filas: [{ como, que }] }]`. `ids`: las acciones
 * disponibles en esta copia del sitio (sin línea de tiempo no hay «plano de la época», por ejemplo).
 */
export function controlesVisibles(ids = ACCIONES.map((a) => a.id)) {
  const acciones = ACCIONES.filter((a) => ids.includes(a.id))
  return [
    { titulo: 'Con el ratón', filas: CON_RATON },
    { titulo: 'Con los dedos', tactil: true, filas: CON_DEDOS },
    { titulo: 'En la pantalla', filas: EN_PANTALLA },
    { titulo: 'Botones y teclas', filas: acciones.map((a) => ({ como: a.boton, tecla: a.tecla, que: a.que })) },
  ]
}
