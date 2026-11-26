/** Caja de píxeles a coordenadas normalizadas, sin dependencias de render. */
export function rectDeCalles({ caja }, { ancho, alto }) {
  const ok = Array.isArray(caja) && caja.length === 4 && caja.every(Number.isFinite) && caja[2] > caja[0] && caja[3] > caja[1]
  if (!ok) throw new Error(`calles de época: caja inválida (${JSON.stringify(caja)})`)
  return [caja[0] / ancho, caja[1] / alto, caja[2] / ancho, caja[3] / alto]
}

