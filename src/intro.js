/**
 * La bienvenida (specs/01, «Intro»): qué dice y cuándo se muestra. Lógica pura; el DOM está en
 * src/acerca-panel.js. Se muestra una vez por navegador (queda anotado en localStorage); `?intro` la fuerza y
 * `?sinintro` o `?capture` la saltean (los tests y las capturas no la ven nunca).
 */

/** Clave de localStorage: «ya la vio». */
export const CLAVE_INTRO = 'caracas:intro-vista'

/**
 * ¿Se muestra la bienvenida? `almacen()` devuelve el localStorage (o lanza: en modo privado, con las cookies
 * bloqueadas o dentro de un iframe aislado el solo acceso puede fallar; entonces se muestra, sin recordar).
 */
export function debeMostrarIntro(params, almacen) {
  if (params.has('intro')) return true
  if (params.has('sinintro') || params.has('capture')) return false
  try {
    return almacen().getItem(CLAVE_INTRO) === null
  } catch {
    return true
  }
}

/** Anota que ya se vio. Devuelve si se pudo anotar. */
export function recordarIntro(almacen) {
  try {
    almacen().setItem(CLAVE_INTRO, '1')
    return true
  } catch {
    return false
  }
}

/** Los textos de la bienvenida. Los años que nombra son los de la línea de tiempo (un test los coteja). */
export const TEXTO_INTRO = Object.freeze({
  titulo: 'Caracas, de 1772 a 1936',
  bajada: 'La ciudad de un plano de 1936, levantada manzana por manzana, y los planos más viejos que la hacen crecer.',
  parrafos: Object.freeze([
    'Lo que ves es el plano de Caracas que la Dirección de Cartografía Nacional dibujó en 1936, tendido como una hoja sobre el relieve del valle. De ese dibujo se levanta la ciudad: las manzanas, lo edificado y los patios están donde el plano los pone.',
    'La línea de tiempo la lleva hacia atrás. Sobre el mismo plano se calzaron los de 1772, 1843, 1889 y 1911, y en cada año queda en pie solo lo que ese plano ya dibujaba; donde todavía no había ciudad, la hoja queda en blanco. Las alturas, las fachadas y los techos no salen de ningún plano: son una reconstrucción, hecha con las costumbres y las imágenes de cada época.',
  ]),
  conRaton: 'Arrastra para moverte, acércate con la rueda y gira con el botón derecho. Toca un nombre para ir al lugar.',
  conDedos: 'Arrastra con un dedo para moverte, separa dos dedos para acercarte y gíralos para girar la vista. Toca un nombre para ir al lugar.',
  crecer: 'Ver crecer la ciudad',
  entrar: 'Entrar',
  mas: 'Qué estoy viendo y de dónde salen los datos',
})
