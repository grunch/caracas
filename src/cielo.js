/**
 * El cielo de Caracas para los recorridos (a pie, en coche, en avión): celeste arriba, aclarándose hacia el
 * horizonte como la bruma del valle (src/shader/acabado.js), con algunas nubes de buen tiempo y el sol de la
 * tarde, el mismo que tira las sombras (src/luz.js), suave: un disco sin destello que no encandila.
 *
 * En **tinta** (uColor = 0, el de la ciudad) el cielo es del papel: crema, con las nubes y el sol dibujados con
 * un trazo sepia en el borde; en **color**, el celeste. Pasa de uno a otro con la misma transición que la ciudad.
 *
 * Es una cúpula sin profundidad que se dibuja antes que todo y sigue a la cámara (solo gira con ella). En el
 * mapa no se ve: ahí manda la mesa oscura de siempre. Las cuentas están dos veces, en JS (para las pruebas)
 * y en GLSL, con los mismos números.
 *
 * Direcciones: vectores unitarios del mundo (x al este, y arriba, z al sur).
 */
import { Color, Mesh, ShaderMaterial, SphereGeometry, BackSide, Vector3 } from 'three'
import { vectorSol } from './luz.js'

/** Los colores van en sRGB (como se ven); el shader los recibe lineales. */
const EN_COLOR = Object.freeze({
  cenit: 0x5a9be0, // el celeste de la eterna primavera
  horizonte: 0xd3e2ee, // claro y un poco brumoso, como el valle a lo lejos
  sol: 0xfff7e6, // blanco tibio, sin pasar de 1: no encandila
  nube: 0xffffff,
  sombraNube: 0xc9d3de,
})
const EN_TINTA = Object.freeze({
  cenit: 0xeadcb9, // el papel de la hoja, un poco más tostado arriba
  horizonte: 0xf3e8cf,
  sol: 0xfffaee, // el disco, papel en blanco
  nube: 0xfaf5e8,
  sombraNube: 0xe8dcc0,
})
const TONOS = Object.freeze(Object.keys(EN_COLOR))

export const CIELO = Object.freeze({
  color: EN_COLOR,
  tinta: EN_TINTA,
  trazo: Object.freeze({ color: 0x5a4a3a, nube: 0.45, sol: 0.55 }), // el sepia de los bordes, solo en tinta
  curva: 3.2, // cuánto baja el cenit hacia el horizonte (más, más franja clara)
  disco: 0.75, // radio del disco del sol, en grados
  borde: 0.35, // lo que tarda en desvanecerse su borde, en grados
  halo: Object.freeze({ fuerza: 0.32, grados: 3.5 }), // la corona cercana, tenue
  resplandor: Object.freeze({ fuerza: 0.08, grados: 20 }), // el cielo que se aclara alrededor
  nubes: Object.freeze({ escala: 1.4, cobertura: 0.52, suavidad: 0.16, altura: 0.08, fundido: 0.18, fuerza: 0.92 }),
})

const RAD = Math.PI / 180
const sujetar = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const escalon = (a, b, x) => { const t = sujetar((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const mezclar = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
const lineal = (hex) => new Color(hex).toArray()
const fract = (x) => x - Math.floor(x)
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Cuánto sol hay a un ángulo del sol (por su coseno): 1 en el disco, una corona tenue y nada a lo lejos. */
export function brilloDelSol(coseno) {
  const grados = Math.acos(sujetar(coseno, -1, 1)) / RAD
  const disco = 1 - escalon(CIELO.disco, CIELO.disco + CIELO.borde, grados)
  const corona = CIELO.halo.fuerza * Math.exp(-grados / CIELO.halo.grados) + CIELO.resplandor.fuerza * Math.exp(-grados / CIELO.resplandor.grados)
  return Math.max(disco, corona)
}

/** El aro de tinta del sol (0…1), en el borde del disco: ni adentro ni a pocos grados. */
export function trazoDelSol(coseno) {
  const grados = Math.acos(sujetar(coseno, -1, 1)) / RAD
  const medio = CIELO.disco + CIELO.borde / 2
  return escalon(CIELO.disco - 0.2, medio, grados) * (1 - escalon(medio, CIELO.disco + CIELO.borde + 0.2, grados))
}

/** El trazo del borde de una nube (0…1), de su nubosidad: lleno a media nube, nada en el cielo limpio ni adentro. */
const trazoDeNube = (n) => escalon(0.3, 0.5, n) * (1 - escalon(0.5, 0.7, n))

// ruido de valor (espejo del GLSL): suave, de celdas de 1
const azar = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
function ruido(x, y) {
  const [ix, iy] = [Math.floor(x), Math.floor(y)]
  const [fx, fy] = [x - ix, y - iy]
  const [ux, uy] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)]
  const a = azar(ix, iy) + (azar(ix + 1, iy) - azar(ix, iy)) * ux
  const b = azar(ix, iy + 1) + (azar(ix + 1, iy + 1) - azar(ix, iy + 1)) * ux
  return a + (b - a) * uy
}
function capas(x0, y0) {
  let [x, y, suma, peso] = [x0, y0, 0, 0.5]
  for (let i = 0; i < 4; i++) {
    suma += peso * ruido(x, y)
    x = x * 2.03 + 17.1
    y = y * 2.03 + 9.2
    peso *= 0.5
  }
  return suma / 0.9375
}

/** Cuánta nube hay en una dirección (0…1): sobre un techo plano de nubes, nada bajo el horizonte. */
export function nubosidad([x, y, z]) {
  if (y <= 0) return 0
  const N = CIELO.nubes
  const k = N.escala / (y + N.altura)
  return escalon(N.cobertura, N.cobertura + N.suavidad, capas(x * k, z * k)) * escalon(0, N.fundido, y)
}

/** El color del cielo en una dirección (lineal, 0…1). `color`: 0 en tinta … 1 en color (el uColor de la ciudad). */
export function colorDelCielo(dir, { sol = vectorSol(), color = 1 } = {}) {
  const tono = (k) => mezclar(lineal(CIELO.tinta[k]), lineal(CIELO.color[k]), color)
  const arriba = sujetar(dir[1])
  const fondo = mezclar(tono('cenit'), tono('horizonte'), (1 - arriba) ** CIELO.curva)
  const cos = punto(dir, sol)
  const conSol = mezclar(fondo, tono('sol'), brilloDelSol(cos))
  const nube = mezclar(tono('sombraNube'), tono('nube'), sujetar(0.55 + 0.45 * cos))
  const n = nubosidad(dir)
  const conNubes = mezclar(conSol, nube, CIELO.nubes.fuerza * n)
  const T = CIELO.trazo
  const trazo = (1 - color) * Math.max(T.nube * trazoDeNube(n), T.sol * trazoDelSol(cos))
  return mezclar(conNubes, lineal(T.color), trazo)
}

const f = (n) => n.toFixed(4)

const VERTICE = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    // solo el giro de la cámara: el cielo está siempre igual de lejos; z casi en el fondo (no se recorta)
    vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    gl_Position = vec4(p.xy, p.w * 0.9999, p.w);
  }`

const FRAGMENTO = /* glsl */ `
  uniform vec3 ${TONOS.flatMap((k) => [`uColor_${k}`, `uTinta_${k}`]).join(', ')}, uTrazo, uSol;
  uniform float uColor;
  varying vec3 vDir;

  float azar(vec2 p) { return fract(sin(p.x * 127.1 + p.y * 311.7) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(azar(i), azar(i + vec2(1.0, 0.0)), u.x), mix(azar(i + vec2(0.0, 1.0)), azar(i + 1.0), u.x), u.y);
  }
  float capas(vec2 p) {
    float suma = 0.0, peso = 0.5;
    for (int i = 0; i < 4; i++) { suma += peso * ruido(p); p = p * 2.03 + vec2(17.1, 9.2); peso *= 0.5; }
    return suma / 0.9375;
  }
  float nubosidad(vec3 d) {
    if (d.y <= 0.0) return 0.0;
    vec2 p = d.xz * (${f(CIELO.nubes.escala)} / (d.y + ${f(CIELO.nubes.altura)}));
    return smoothstep(${f(CIELO.nubes.cobertura)}, ${f(CIELO.nubes.cobertura + CIELO.nubes.suavidad)}, capas(p)) * smoothstep(0.0, ${f(CIELO.nubes.fundido)}, d.y);
  }
  float brilloDelSol(float coseno) {
    float grados = degrees(acos(clamp(coseno, -1.0, 1.0)));
    float disco = 1.0 - smoothstep(${f(CIELO.disco)}, ${f(CIELO.disco + CIELO.borde)}, grados);
    float corona = ${f(CIELO.halo.fuerza)} * exp(-grados / ${f(CIELO.halo.grados)}) + ${f(CIELO.resplandor.fuerza)} * exp(-grados / ${f(CIELO.resplandor.grados)});
    return max(disco, corona);
  }

  float trazoDelSol(float coseno) {
    float grados = degrees(acos(clamp(coseno, -1.0, 1.0)));
    float medio = ${f(CIELO.disco + CIELO.borde / 2)};
    return smoothstep(${f(CIELO.disco - 0.2)}, medio, grados) * (1.0 - smoothstep(medio, ${f(CIELO.disco + CIELO.borde + 0.2)}, grados));
  }
  float trazoDeNube(float n) { return smoothstep(0.3, 0.5, n) * (1.0 - smoothstep(0.5, 0.7, n)); }

  void main() {
    vec3 d = normalize(vDir);
${TONOS.map((k) => `    vec3 ${k} = mix(uTinta_${k}, uColor_${k}, uColor);`).join('\n')}
    vec3 c = mix(cenit, horizonte, pow(1.0 - clamp(d.y, 0.0, 1.0), ${f(CIELO.curva)}));
    float cosSol = dot(d, uSol);
    c = mix(c, sol, brilloDelSol(cosSol));
    vec3 laNube = mix(sombraNube, nube, clamp(0.55 + 0.45 * cosSol, 0.0, 1.0));
    float n = nubosidad(d);
    c = mix(c, laNube, ${f(CIELO.nubes.fuerza)} * n);
    float trazo = (1.0 - uColor) * max(${f(CIELO.trazo.nube)} * trazoDeNube(n), ${f(CIELO.trazo.sol)} * trazoDelSol(cosSol));
    c = mix(c, uTrazo, trazo);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`

/**
 * La cúpula del cielo, oculta hasta que se recorre la ciudad. `mostrar(si)` la prende o la apaga.
 * `U`: los uniforms de la ciudad; el cielo comparte su uColor (sin ellos, queda en color).
 */
export function crearCielo({ U = { uColor: { value: 1 } } } = {}) {
  const tonos = Object.fromEntries(TONOS.flatMap((k) => [
    [`uColor_${k}`, { value: new Color(CIELO.color[k]) }],
    [`uTinta_${k}`, { value: new Color(CIELO.tinta[k]) }],
  ]))
  const material = new ShaderMaterial({
    uniforms: {
      ...tonos,
      uTrazo: { value: new Color(CIELO.trazo.color) },
      uSol: { value: new Vector3(...vectorSol()) },
      uColor: U.uColor,
    },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
  })
  const malla = new Mesh(new SphereGeometry(1, 48, 24), material)
  malla.renderOrder = -1000
  malla.frustumCulled = false
  malla.visible = false
  malla.name = 'cielo'
  return {
    malla,
    mostrar(si) { malla.visible = Boolean(si) },
  }
}

/** ¿Se ve el cielo con estas clases del body? Sí mientras dure un recorrido (src/main.js, cambioDeModo). */
export const cieloDeModo = (clases) => [...clases].includes('modo')
