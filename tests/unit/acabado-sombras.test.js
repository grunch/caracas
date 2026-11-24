import { describe, test, expect } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, ShaderMaterial } from 'three'
import { repartoDeSombra } from '../../src/acabado.js'
import { crearAvion } from '../../src/volar-modo.js'

const malla = ({ tira = true, profundidad = true } = {}) => {
  const m = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
  m.castShadow = tira
  if (profundidad) m.customDepthMaterial = new ShaderMaterial()
  return m
}

describe('repartoDeSombra', () => {
  test('una malla suelta con castShadow y material de profundidad tira; lo demás visible se oculta en la pasada', () => {
    // Arrange
    const casas = malla()
    const suelo = malla({ tira: false })
    const oculto = malla()
    oculto.visible = false
    // Act
    const { tiran, ocultos } = repartoDeSombra([casas, suelo, oculto])
    // Assert
    expect(tiran).toEqual([casas])
    expect(ocultos).toEqual([suelo])
  })

  test('un grupo (la avioneta) tira con sus piezas; las piezas sin material de profundidad se ocultan', () => {
    // Arrange
    const ala = malla()
    const adorno = malla({ profundidad: false })
    const grupo = new Group()
    grupo.add(ala, adorno)
    // Act
    const { tiran, ocultos } = repartoDeSombra([grupo])
    // Assert
    expect(tiran).toEqual([ala])
    expect(ocultos).toEqual([adorno])
  })

  test('la pose cambia cuando se mueve o gira lo que tira, y no con lo que no tira', () => {
    // Arrange
    const avion = crearAvion()
    avion.visible = true
    const suelo = malla({ tira: false })
    const antes = repartoDeSombra([avion, suelo]).pose
    // Act
    suelo.position.x = 50
    const conSueloMovido = repartoDeSombra([avion, suelo]).pose
    avion.position.x = 10
    const movido = repartoDeSombra([avion, suelo]).pose
    avion.rotation.y = 0.3
    const girado = repartoDeSombra([avion, suelo]).pose
    // Assert
    expect(conSueloMovido).toBe(antes)
    expect(movido).not.toBe(antes)
    expect(girado).not.toBe(movido)
  })

  test('la pose cambia cuando un grupo de árboles pasa de cerca a lejos, aunque tire lo mismo (revisión de #180)', () => {
    // Arrange: como src/arboles.js, una malla que tira sombra con dos hijas, una sola visible a la vez
    const arboles = malla()
    const cerca = malla()
    const lejos = malla()
    lejos.visible = false
    arboles.add(cerca, lejos)
    const deCerca = repartoDeSombra([arboles])
    // Act
    cerca.visible = false
    lejos.visible = true
    const deLejos = repartoDeSombra([arboles])
    // Assert: tiran lo mismo, pero el mapa de sombras tiene que rehacerse
    expect(deLejos.tiran).toEqual(deCerca.tiran)
    expect(deLejos.pose).not.toBe(deCerca.pose)
  })
})

describe('crearAvion y las sombras', () => {
  test('cada pieza de la avioneta lleva material de profundidad: tira sombra en el mapa propio (src/acabado.js)', () => {
    // Arrange
    const avion = crearAvion()
    avion.visible = true
    // Act
    const { tiran, ocultos } = repartoDeSombra([avion])
    // Assert
    expect(tiran).toHaveLength(avion.children.length)
    expect(ocultos).toEqual([])
  })
})
