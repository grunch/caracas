/**
 * El material de la ciudad: MeshLambert parcheado. Hace la ola (cada casa sube cuando el
 * frente, que sale de la plaza, la alcanza; con un desfase por semilla) y pinta el techo con
 * el propio plano, como el modo tinta del original. Las paredes van en papel.
 */
import { MeshLambertMaterial, Vector2 } from 'three'

export function crearMaterialCiudad({ plano, metro, mapa }) {
  const U = {
    uOla: { value: 0 }, // radio del frente de la ola, en metros
    uAnchoOla: { value: 260 }, // cuánto tarda una casa en subir entera, en metros de frente
    uMapa: { value: mapa },
    uHoja: { value: new Vector2(plano.ancho, plano.alto) },
    uPlaza: { value: new Vector2(plano.plaza[0], plano.plaza[1]) },
    uMetro: { value: metro },
  }
  const material = new MeshLambertMaterial({ color: 0xf1e6cd })
  material.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U)
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aInfo; uniform float uOla, uAnchoOla; varying vec3 vMundo; varying float vTecho;
        float azar(float n) { return fract(sin(n * 12.9898) * 43758.5453); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // cuánto se levantó esta casa: la ola sale de la plaza; cada una a su tiempo
        float sube = smoothstep(0.0, 1.0, (uOla - aInfo.x - azar(aInfo.y) * 60.0) / uAnchoOla);
        transformed.y *= sube;
        vTecho = step(0.5, normal.y);`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`)
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uMapa; uniform vec2 uHoja, uPlaza; uniform float uMetro;
        varying vec3 vMundo; varying float vTecho;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // el techo es el plano en ese punto; la pared, papel con un leve tono por la semilla
        vec2 uvPlano = (vMundo.xz / uMetro + uPlaza) / uHoja;
        vec3 plano = texture2D(uMapa, vec2(uvPlano.x, 1.0 - uvPlano.y)).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, plano, vTecho);`)
  }
  return { material, U }
}
