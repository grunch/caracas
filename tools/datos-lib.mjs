// Lógica pura del pipeline de datos (la usa tools/datos.mjs): qué pasos hay que correr y si los
// conteos del resultado son los esperados.

/**
 * Pasos a correr, en orden. Un paso corre si: se fuerza; está en --desde o después; le falta una
 * salida; alguna entrada la produce un paso que corre; o alguna entrada es más nueva que sus salidas.
 * `tiempos`: { ruta: mtime } solo de lo que existe.
 */
export function pendientes(pasos, tiempos, { forzar = false, desde = null } = {}) {
  const desdeIdx = desde === null ? Infinity : pasos.findIndex((p) => p.id === desde)
  if (desdeIdx === -1) throw new Error(`datos: no existe el paso "${desde}"`)
  const producidas = new Set(pasos.flatMap((p) => p.salidas))
  for (const p of pasos) {
    for (const e of p.entradas) {
      if (!producidas.has(e) && !(e in tiempos)) throw new Error(`datos: falta la entrada de origen ${e} (paso ${p.id})`)
    }
  }
  const sucias = new Set()
  const correr = []
  pasos.forEach((p, i) => {
    const faltaSalida = p.salidas.some((s) => !(s in tiempos))
    const entradaSucia = p.entradas.some((e) => sucias.has(e))
    const masNueva = Math.max(...p.entradas.map((e) => tiempos[e] ?? -Infinity)) >
      Math.min(...p.salidas.map((s) => tiempos[s] ?? -Infinity))
    if (forzar || i >= desdeIdx || faltaSalida || entradaSucia || masNueva) {
      correr.push(p.id)
      p.salidas.forEach((s) => sucias.add(s))
    }
  })
  return correr
}

/** Errores (texto) de los conteos fuera de su tolerancia relativa. */
export function verificarConteos(medidos, esperados) {
  return Object.entries(esperados).flatMap(([nombre, { valor, tolerancia }]) => {
    const medido = medidos[nombre]
    if (typeof medido !== 'number') return [`${nombre}: no se midió`]
    const desvio = Math.abs(medido - valor) / valor
    return desvio <= tolerancia ? [] : [`${nombre}: ${medido}, se esperaban ${valor} ± ${Math.round(tolerancia * 100)} %`]
  })
}
