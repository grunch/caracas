# Workflows de las reglas de construcción (T82)

Scripts de la herramienta Workflow de Claude Code para aplicar y mantener las reglas de [specs/13](../../13-reglas-de-construccion.md) en todas las épocas. Se corren tal cual: Workflow con `scriptPath` apuntando al archivo y `args` en JSON.

| Script | Agentes | Qué hace | Argumentos | Salida que se junta |
|---|---|---|---|---|
| [investigacion.js](investigacion.js) | 7 buscadores + 7 verificadores + 1 síntesis | F0: cifras de cada época con fuente (casas, habitantes, solares, frente, ancho de calle, tipología, edificios, cauces), cada afirmación con un verificador que intenta refutarla | `{ temas?: ['solares', 'casas', 'calles', 'tipologia', 'pueblos', 'edificios', 'agua'] }` | `specs/reglas/investigacion.json`, tabla de specs/13 § 3 |
| [diagnostico-epocas.js](diagnostico-epocas.js) | por época: revisor + verificador + planificador; 1 consolidador | Diagnóstico de cada época contra R1–R12 sobre capturas, plano original y medición; tareas T82.N consolidadas. Con `modo: 'cierre'`, si cada regla cierra | `{ modo, epocas: [{ indice, año, capturas, original, medicion }] }` | `specs/reglas/diagnostico-<año>.json`, filas T82.N de specs/07, tabla de specs/13 § 8 |
| [capturas.mjs](capturas.mjs) | — (script de Node) | Las capturas fijas de una época, mismas cámaras siempre | `<url> <carpeta> <índice> [vistas]` | Las capturas que recibe el diagnóstico (no van a git) |

## El ciclo por época

1. **Capturas:** `node specs/reglas/workflows/capturas.mjs https://caracas.city <carpeta> <índice>` (o `http://localhost:5173` con los datos de la rama).
2. **Medición:** `.venv/bin/python tools/geo/reglas_mapa.py --epoca <año>`, que escribe `specs/reglas/medicion-<año>.json` (desde F1).
3. **Diagnóstico:** `diagnostico-epocas.js` con las rutas de las capturas, el `vista.jpg` del plano de la época y la medición. Claude revisa las tareas que devuelve y las pasa a la fila T82 de specs/07 y al checklist.
4. **Arreglos:** un PR por tarea (apilados si dependen), con revisiones de Codex y CodeRabbit (specs/13 § 2.5).
5. **Datos:** regenerar con `npm run datos` (revisar el código de salida), volver a medir **todas** las épocas y sacar las capturas de nuevo.
6. **Cierre y publicación:** `diagnostico-epocas.js` con `modo: 'cierre'`; con todo verde o en límites, `npm run datos:publicar`. Después, la época siguiente.

Planos originales por época (`fuentes/mapas/<carpeta>/vista.jpg`; la carpeta es el `plano` de cada época en `tools/geo/epocas/epocas.json`):

| Época | Plano |
|---|---|
| 1578 | `1578-commons-pimentel` |
| 1772 | `1772-pares-agi-exato-mapa` |
| 1843 | `1843-nypl-jesurun-facsimil-muller-stapler` |
| 1889 | `1889-bnf-mestre` |
| 1911 | `1911-princeton-plano-de-caracas-razetti` |
| 1936 | `1936-archiveorg-caracas-dcn-hoja1` |
