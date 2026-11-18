/** Un paso de `valor` hacia `objetivo`, de a lo sumo `paso`, sin pasarse. */
export function acercar(valor, objetivo, paso) {
  return objetivo > valor ? Math.min(objetivo, valor + paso) : Math.max(objetivo, valor - paso)
}
