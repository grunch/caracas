export const meta = {
  name: 'censo-1843',
  description: 'Censo 1B de 1843: un lector por sector clasifica cada manzana del original y corrige el borrador',
  phases: [{ title: 'Censo por sector' }],
}
const S = '/tmp/claude-1000/-disco-dev-caracas/19152184-a166-4ba7-b52b-c42dae76c69d/scratchpad/censo1843'
const filas = [1, 2, 3, 4, 5], cols = [1, 2, 3, 4, 5]
const sectores = filas.flatMap(f => cols.map(c => `S1843-${f}${c}`))
const prompt = id => `Censo de la fase 1B de la auditoría de 1843 (proyecto en /disco/dev/caracas; plan en specs/11-auditoria-y-correccion-1843.md, que remite a specs/08). Tu sector: ${id}. Lectura visual cuidadosa sobre el ORIGINAL; nada se inventa; lo dudoso se marca "dudosa".

Entradas:
- Original: /disco/dev/caracas/fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler/original.tiff (7216×5412, norte arriba). Dato descargado: ábrelo solo con \`/disco/dev/caracas/.venv/bin/python -I\` (Pillow, numpy; Image.MAX_IMAGE_PIXELS=None).
- Tu sector en /disco/dev/caracas/specs/auditoria-1843/sectores.json: "caja_px" (la tuya) y "caja_lectura_px" (con 60 px de solape para mirar el contexto).
- Borrador automático de manzanas: specs/auditoria-1843/manzanas-borrador.json (candidatas K1843-NNNN con caja y centro). Lámina ya hecha: ${S}/${id}-borrador.png (recorte de tu caja de lectura; azul = tu caja; rojo = candidatas con sus 4 últimos dígitos). El borrador a veces UNE dos manzanas (una calle no detectada) o PARTE una (rayas blancas del rayado); también omite manzanas claras.

Cómo es el plano: manzanas rayadas (el rayado indica la PARROQUIA, no la ocupación: toda manzana rayada es urbanizada), calles blancas, cuadrícula punteada fina encima (no son calles), lotes blancos con una letra mayúscula (iglesias/conventos) o minúscula (puntos notables), plazas en blanco (la Plaza Bolívar es un cuadrado con borde de trazos cerca de x≈3260, y≈2700), huertas/estancias punteadas o con árboles, quebradas y ríos con sus riberas, cerros con sombreado. Los números (1–136) junto a una esquina dentro de la manzana son nombres de esquina.

Qué hacer: recorre TODA tu caja_px en teselas de ~500×500 px del original (amplía ×1,5–2 para leer) guardadas en ${S}/${id}/, mirándolas con la herramienta Read. Registra cada manzana o unidad cuyo CENTRO cae dentro de tu caja_px (las que se centran fuera son de otro sector: no las registres). Para cada una:
- "local": a, b, c…; "caja_px": [x0,y0,x1,y1] en píxeles del original; "poligono_px": sus esquinas en orden (4 si es rectangular; más si es irregular), en píxeles del original, sobre el borde de la manzana (no al eje de la calle).
- "ocupacion": rayada | lote_especial | plaza | huerta | terreno_libre | parte_de_otra_unidad | descartada_no_edificacion. Una manzana rayada que contiene un lote blanco con letra se registra rayada y el lote aparte como lote_especial (con su letra en "letras").
- "letras": letras impresas dentro; "esquinas": números de esquina impresos en ella; "rayado": descripción breve del patrón (horizontal, diagonal, vertical, cruzado, punteado).
- "borrador": {"relacion": "igual" | "une_varias" | "parte_de" | "sin_candidata", "candidatas": ["K1843-…"]}.
- "lectura": segura | dudosa; "nota": excepciones (entrantes, bordes de quebrada, manzana partida por calle, manzana sin calle de un lado, edificio aislado).
Registra además en "observaciones" lo que no es manzana pero importa al trazado: calles que terminan, callejones, caminos, puentes, quebradas que cortan el damero, con su posición en px.

Verifica cada unidad con un recorte centrado ampliado antes de anotarla y guarda el SHA-256 de cada recorte de verificación. Salida: ${S}/${id}.json
{"sector":"${id}","unidades":[…],"observaciones":[{"tipo","px":[x,y],"nota"}],"recortes":[{"archivo","sha256"}],"teselas":N,"vacio":true|false}
Un sector sin ciudad (cerro, campo, borde) es válido: "vacio": true, con las huertas o terrenos que haya como unidades si están delimitados.
Informe final de 2–4 líneas: cuántas unidades por ocupación, cuántas dudosas, cuántas candidatas del borrador corregidas.`
return await parallel(sectores.map(id => () => agent(prompt(id), { label: `censo:${id}`, phase: 'Censo por sector' })))
