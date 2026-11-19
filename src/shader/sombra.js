import { Matrix4, Vector3, Vector4 } from 'three'
import { vectorSol } from '../luz.js'

/**
 * La sombra arrojada, del lado de quien la recibe (fragment): la ciudad y el suelo, los hitos y los
 * árboles leen el mismo mapa de sombras (src/acabado.js lo dibuja desde el sol) con los mismos uniforms.
 *
 * - `solEn(mundo, N)`: cuánto sol llega al punto (0 a la sombra … 1 al sol). Una cara que le da la
 *   espalda al sol está a la sombra sin mirar el mapa. El punto se corre un poco hacia afuera de su cara
 *   (más cuanto más rasante le llega la luz) para que una cara no se haga sombra a sí misma.
 * - `rayadoSombra(sombra, mundo)`: en tinta la sombra no es gris: es un rayado a pluma en la pantalla,
 *   cuyo grosor sigue a la sombra (en el borde las líneas se afinan). De lejos, cuando una raya ya es más
 *   ancha que la sombra de una casa, queda su tono medio.
 * - `luzDeColor(sol)`: en color, tibia al sol y azulada a la sombra (specs/04).
 */
export const GLSL_SOMBRA = /* glsl */ `
  uniform sampler2DShadow tSombra; uniform mat4 uSombraMat;
  uniform vec4 uSombra; // prendida (0/1), un texel en uv, un texel en metros, 1 / profundidad de la caja en metros
  uniform vec4 uVista; // alcance de las sombras (m), radianes por píxel, píxeles de pantalla por píxel de CSS, —
  uniform vec3 uSol; // hacia el sol
  const vec3 TINTA_SOMBRA = vec3(0.024, 0.015, 0.011);
  float solEn(vec3 mundo, vec3 N) {
    float nl = dot(N, uSol);
    if (nl <= 0.0) return 0.0;
    if (uSombra.x < 0.5) return 1.0;
    vec3 q = (uSombraMat * vec4(mundo + N * uSombra.z * (1.2 + 2.0 * (1.0 - nl)), 1.0)).xyz;
    if (q.x <= 0.0 || q.y <= 0.0 || q.x >= 1.0 || q.y >= 1.0 || q.z >= 1.0) return 1.0;
    q.z -= (0.05 + 0.5 * uSombra.z) * uSombra.w;
    // cuatro lecturas con comparación y filtro bilineal: un borde suave de un par de texeles
    float t = uSombra.y;
    float s = texture(tSombra, vec3(q.xy + t * vec2(-0.75, -0.25), q.z)) + texture(tSombra, vec3(q.xy + t * vec2(0.25, -0.75), q.z))
      + texture(tSombra, vec3(q.xy + t * vec2(0.75, 0.25), q.z)) + texture(tSombra, vec3(q.xy + t * vec2(-0.25, 0.75), q.z));
    // hacia el final del alcance la sombra se va: más allá no hay mapa
    float fuera = smoothstep(0.75 * uVista.x, uVista.x, distance(cameraPosition, mundo));
    return mix(0.25 * s, 1.0, fuera);
  }
  float rayadoSombra(float sombra, vec3 mundo) {
    float px = max(uVista.z, 1.0);
    float a = abs(fract((gl_FragCoord.x - gl_FragCoord.y) / (6.0 * px)) - 0.5) * 2.0;
    float carga = 0.8 * sombra;
    float linea = (1.0 - smoothstep(carga - 0.16, carga + 0.16, a)) * step(0.02, sombra);
    float metrosPorPixel = distance(cameraPosition, mundo) * uVista.y;
    return mix(linea, carga, smoothstep(0.6, 1.8, metrosPorPixel));
  }
  vec3 luzDeColor(float sol) { return mix(vec3(0.70, 0.77, 0.98), vec3(1.03, 1.0, 0.95), smoothstep(0.3, 0.95, sol)); }`

/** Los uniforms de la luz, compartidos por todos los materiales (van en el `U` de la ciudad). */
export function uniformsDeLuz() {
  return {
    uSol: { value: new Vector3(...vectorSol()) },
    tSombra: { value: null }, // sin mapa: three pone una textura de profundidad vacía
    uSombraMat: { value: new Matrix4() },
    uSombra: { value: new Vector4(0, 1, 1, 1) },
    uVista: { value: new Vector4(1000, 0.001, 1, 0) },
  }
}

/** Los nombres de esos uniforms: los materiales propios (hitos, árboles) los toman de `U`. */
export const UNIFORMS_DE_LUZ = Object.freeze(['uSol', 'tSombra', 'uSombraMat', 'uSombra', 'uVista'])
