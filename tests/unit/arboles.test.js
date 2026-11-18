import { describe, test, expect } from 'vitest'
import { InstancedMesh } from 'three'
import { crearArboles, instanciasArboles } from '../../src/arboles.js'
import { crearCoords } from '../../src/coords.js'
import { crearMaterialCiudad } from '../../src/material.js'

const coords = crearCoords({ ancho: 1000, alto: 1000, metro: 0.5, plaza: [500, 500] })
const datos = {
  n: 2,
  x: new Uint16Array([500, 600]),
  y: new Uint16Array([500, 400]),
  radio: new Float32Array([4, 2.5]),
  nace: new Uint16Array([0, 3]),
}

describe('instanciasArboles', () => {
  test('pasa los píxeles al mundo y deja radio, nace y una semilla estable por árbol', () => {
    // Act
    const inst = instanciasArboles(datos, coords)
    // Assert
    expect([...inst.posiciones]).toEqual([0, 0, 50, -50])
    expect([...inst.radios]).toEqual([4, 2.5])
    expect([...inst.nace]).toEqual([0, 3])
    expect(inst.semillas.length).toBe(2)
    expect([...instanciasArboles(datos, coords).semillas]).toEqual([...inst.semillas])
    expect(inst.semillas[0]).not.toBe(inst.semillas[1])
  })
})

describe('crearArboles', () => {
  const { U } = crearMaterialCiudad({ plano: { ancho: 1000, alto: 1000, plaza: [500, 500] }, metro: 0.5, mapa: null })
  const malla = crearArboles({ datos, coords, U })

  test('una sola malla instanciada con un árbol por instancia', () => {
    expect(malla).toBeInstanceOf(InstancedMesh)
    expect(malla.count).toBe(2)
    expect(malla.frustumCulled).toBe(false) // el relieve los sube en el shader
  })

  test('cada instancia está en su lugar, escalada por su radio', () => {
    const m = malla.instanceMatrix.array
    expect([m[16 + 12], m[16 + 13], m[16 + 14]]).toEqual([50, 0, -50])
    expect(m[16]).toBeCloseTo(2.5)
  })

  test('comparte los uniforms de la ciudad: tinta/color, ola, épocas y relieve cambian juntos', () => {
    const u = malla.material.uniforms
    for (const k of ['uColor', 'uOla', 'uAnchoOla', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca', 'tRelieve', 'uRelieveHoja', 'uExageracion']) {
      expect(u[k]).toBe(U[k])
    }
  })

  test('el shader apoya el árbol en el suelo y lo esconde antes de que nazca', () => {
    const { vertexShader } = malla.material
    expect(vertexShader).toContain('sueloEn(')
    expect(vertexShader).toContain('aArbol')
    expect(vertexShader).toMatch(/epocaAqui/)
  })
})
