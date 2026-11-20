# Lectura individual de terrenos libres y cuerpos aislados

T33j.1k. Se inspeccionaron los 67 registros que no estaban en las dos entregas de
lectura individual: 45 terrenos libres, 20 cuerpos aislados, una parte de otra
unidad y un candidato descartado. Las observaciones por ID, sector y caja están
en [lectura-restantes-original.json](lectura-restantes-original.json).

La cobertura individual del censo queda en **292/292 registros**, repartidos sin
duplicados en 147 unidades con cara candidata, 78 unidades edificadas sin cara
única y estos 67 registros. El denominador incluye un descarte y una parte de otra
unidad: no significa 292 manzanas históricas. Este cierre de lectura **no cierra
la fase 1**, cuya correspondencia geométrica y revisión de calles/accesos siguen
pendientes. Tampoco demuestra que el censo haya localizado cada símbolo del plano.

## Decisiones que evitan correcciones incorrectas

- Los terrenos libres de periferia tienen con frecuencia tres líneas dibujadas y
  un cuarto lado abierto. No son automáticamente manzanas de casas sin terminar.
- U0085 y U0278 se separan por la ribera: el cuerpo rojo aislado dentro del meandro
  no autoriza ocupar el terreno libre del otro lado.
- U0256 es pentagonal; U0264 es una franja diagonal estrecha. Conservar las formas
  de los cuerpos, sin convertir sus cajas de localización en solares rectangulares.
- U0272 es una franja con retornos en el pie del Calvario, separada de U0013 y U0014
  por calles. La categoría previa «aislada» describe el cuerpo separado, no una
  casa única. No unirlo a la manzana triangular vecina.
- U0257 conserva su clasificación de parte de otra unidad; no duplicarla.
- U0271 contiene vegetación, no un cuerpo rojo; se confirma su descarte.

## Reproducción y controles

Usar el original con SHA-256
`4696d038a55b8088302a496b6eb4678b11173d98d3a15c589530cf78ee7bb62b`.
Para cada `bbox_localizacion=[x0,y0,x1,y1]`, recortar desde `(x0-8,y0-8)` hasta
`(x1+8,y1+8)`. Se observaron ocho paneles de nueve recortes, con el último incompleto,
ampliados conservando su proporción; no son imágenes métricas. U0272 se comprobó
además con un margen de 70 píxeles para ver sus calles vecinas. Los recortes locales
están en `.cache/cierre-lectura-1772/.cache/restantes-0.png` a `restantes-7.png`
del checkout principal, fuera de git.

Comprobar que los conjuntos `unidad` de `lectura-bordes-original.json`,
`contornos-sin-cara.json` y `lectura-restantes-original.json` sean disjuntos y que
su unión coincida exactamente con los `id_fuente` de `unidades-original.json`.
Se verificaron 147 + 78 + 67 = 292, las clasificaciones previas, los sectores y el
hash del original. No se modificó código ni datos del generador; esta entrega
reutiliza las suites aprobadas de #83 y valida los registros documentales.
