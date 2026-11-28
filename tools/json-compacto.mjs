/**
 * JSON legible sin gastar una línea por número: lo que entra en `ancho` caracteres va en una sola línea y lo demás
 * se abre, un elemento por línea. Para los datos curados que se revisan en un diff. Lógica pura.
 */
export const ANCHO = 400

export function jsonCompacto(valor, ancho = ANCHO, sangria = '') {
  // como JSON.stringify: lo que no tiene forma en JSON (undefined, una función), suelto o en una lista, es null
  const corto = JSON.stringify(valor) ?? 'null'
  if (valor === null || typeof valor !== 'object' || corto.length <= ancho) return corto
  const dentro = sangria + ' '
  if (Array.isArray(valor)) return `[\n${Array.from(valor, (v) => dentro + jsonCompacto(v, ancho, dentro)).join(',\n')}\n${sangria}]`
  const campos = Object.entries(valor).filter(([, v]) => JSON.stringify(v) !== undefined)
  return `{\n${campos.map(([k, v]) => `${dentro}${JSON.stringify(k)}: ${jsonCompacto(v, ancho, dentro)}`).join(',\n')}\n${sangria}}`
}
