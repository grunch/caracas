export const meta = {
  name: 'revision-dudosas-1843',
  description: 'Revisión independiente de las 58 lecturas dudosas del censo de 1843, por sector',
  phases: [{ title: 'Revisar dudosas' }],
}
const S = '/tmp/claude-1000/-disco-dev-caracas/19152184-a166-4ba7-b52b-c42dae76c69d/scratchpad/dudosas1843'
const sectores = ['S1843-12','S1843-22','S1843-23','S1843-24','S1843-25','S1843-32','S1843-33','S1843-34','S1843-35','S1843-42','S1843-43','S1843-44','S1843-45','S1843-51','S1843-52','S1843-53','S1843-54']
const prompt = id => `Revisión independiente (fase 2 de la auditoría de 1843, proyecto /disco/dev/caracas; plan en specs/11-auditoria-y-correccion-1843.md). Otro lector censó el sector ${id} del plano de Jesurún de 1843 y marcó algunas unidades como "dudosa". Tu trabajo: mirar cada una de nuevo en el ORIGINAL y decidir, sin dejarte llevar por la lectura anterior. Nada se inventa.

Entradas:
- Censo: /disco/dev/caracas/specs/auditoria-1843/censo.json → "unidades" con "sector": "${id}" y "lectura": "dudosa" (tienen id U1843-NNNN, caja_px, poligono_px, ocupacion, letras, nota).
- Original: /disco/dev/caracas/fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler/original.tiff (7216×5412, norte arriba). NO lo abras entero con Pillow (gasta hasta 14 GB): recorta con /disco/dev/caracas/.venv/bin/python -I /tmp/claude-1000/-disco-dev-caracas/19152184-a166-4ba7-b52b-c42dae76c69d/scratchpad/scripts/recorte2.py <tiff> <salida.png> x0 y0 x1 y1 escala  (lee solo los bytes del recorte). Guarda los recortes en ${S}/${id}/ y míralos con Read.
- Vocabulario de ocupación: rayada (manzana o edificio rayado: urbanizado; el tipo de rayado es la parroquia), lote_especial (blanco con letra: iglesia, convento, punto notable), plaza, huerta (punteado/árboles, cercado), terreno_libre, parte_de_otra_unidad, descartada_no_edificacion (marco, rótulo, rosa de los vientos, sombreado de cerro).

Para cada unidad dudosa: recorte con 80 px de margen alrededor de su caja, ampliado ×2 (y otro más amplio si hace falta contexto). Decide:
- "decision": "aprobada" (la ocupación y el contorno están bien), "corregida" (da "ocupacion" nueva y/o "poligono_px" nuevo, en píxeles del original), o "rechazada" (no es una unidad: explica).
- "seguridad": "segura" o "sigue_dudosa" (si de verdad el plano no deja decidir; di por qué).
- "motivo": una o dos frases con lo que se ve.
- "sha256" del recorte principal.

Salida: ${S}/${id}.json  {"sector":"${id}","revisiones":[{"unidad":"U1843-…","decision","ocupacion","poligono_px"?,"seguridad","motivo","recorte","sha256"}]}
Informe final de una línea: cuántas aprobadas, corregidas, rechazadas y cuántas siguen dudosas.`
return await parallel(sectores.map(id => () => agent(prompt(id), { label: `dudosas:${id}`, phase: 'Revisar dudosas' })))
