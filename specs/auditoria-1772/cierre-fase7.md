# Cierre de la fase 7 · cierres y accesos de 1772

Fecha: 23-11-2026. T33j.7a (I1772-001, -002, -003 y -013). Lo genera `tools/geo/cierre_fase7.py` sobre la salida del generador y sobre la colisión del modo a pie del visor: [cierre-fase7.json](cierre-fase7.json). Se miden las casas que el visor deja a la vista en 1772, como en las fases 4 a 6. **Cuenta lo medido; no certifica fidelidad.**

## Qué mide la puerta (specs/08, fase 7)

| Criterio de specs/08 | Medida |
|---|---|
| No se entra a patios privados por huecos accidentales | **Sin aberturas indebidas:** se miden los frentes medibles de la puerta de la fase 5, con los rayos cada 1 m y la recta de la manzana que arma el frente. Una abertura es un tramo de al menos 2 m (una puerta) donde el rayo pasa la recta de la fachada por más de 2 m o no toca nada, entre la primera y la última estación sobre la fachada. Es **indebida** si el original pinta edificado en ese lugar (lo edificado revisado de la fase 4), medido en un punto 1 m detrás de la recta. Si el original deja ahí un solar, un hueco o un pasaje, la abertura es legítima. |
| Cada casa tiene acceso a calle o acceso documentado | **Casas con acceso:** el criterio de la puerta de la fase 5 sobre la misma ciudad. |
| No se sellan pasajes públicos | **Pasajes públicos abiertos:** las calles libres de la puerta de la fase 3 sobre la misma ciudad. |
| No se llena con casas un terreno libre | **Terreno libre sin casas:** el criterio de la puerta de la fase 4 sobre la misma ciudad. |
| Revisar colisiones junto con la forma visible | **Lo visible choca** (I1772-013): en el modo a pie, un punto dentro de la planta de cada hito en pie en 1772 tiene que chocar. La colisión la decide el visor: `src/a-pie.js`, armado como en `a-pie-modo.js` con los datos generados (`tools/choca-a-pie.mjs`). La planta de un hito transitable (la Plaza Bolívar: se camina, y chocan sus piezas) no cuenta. |

Los umbrales son inferidos y van declarados en el JSON. Se fijaron antes de medir y no se cambian para que algo pase (1A).

## Línea base (después de la fase 6)

Datos regenerados con el Capitolio de #143, con 6303 casas de 1772 a la vista.

| Criterio | Resultado | Cumplido |
|---|---|---|
| Sin aberturas indebidas | 64 aberturas de 2 m o más en los frentes; **12 indebidas**, donde el original pinta edificado | **no** |
| Casas con acceso | la fase 5, sin casas sin acceso | sí |
| Pasajes públicos abiertos | la fase 3, con las calles libres | sí |
| Terreno libre sin casas | la fase 4, sin casas en lo libre | sí |
| Lo visible choca | **6 hitos atravesables**: Altagracia, el Capitolio, la Casa Amarilla, la Catedral, La Pastora y San Francisco. La rejilla del modo a pie se arma solo con las huellas de las casas (I1772-013). | **no** |

`fase_7_cerrable: false`.

Las 38 aberturas de frente que la fase 5 dejó como límite hasta la fase 7 están entre las 64. Las legítimas, donde el original deja un solar o un hueco, no se cierran: specs/08 pide no llenar con casas un terreno libre.

## Después de T33j.7b: lo visible choca

La rejilla de colisión del modo a pie (`src/a-pie.js`, `rejillaDeCasas`) se armaba solo con las huellas de las casas, así que se atravesaba la fachada de la Catedral (I1772-013) y la de los otros hitos. Ahora también lleva las plantas de los hitos en pie en la época: `src/hitos/plantas.js`, la misma lista que leen las puertas (`tools/hitos-planta.mjs` la reusa). La planta de un hito transitable, la Plaza Bolívar, no entra.

| Criterio | Línea base | Después de T33j.7b |
|---|---|---|
| Sin aberturas indebidas | 12 de 64 | 12 de 64 |
| Casas con acceso / pasajes / terreno libre | cumplen | cumplen |
| Lo visible choca | 6 hitos atravesables | **0 (cumple)** |

## Lo que sigue

- Las 12 aberturas indebidas: cerrarlas con fachada, medianera o tapia según la referencia (I1772-001, -002).
- Volver a medir los frentes de abertura que la fase 5 dejó como límite.

## Reproducir

```
npm run datos -- --desde epocas
.venv/bin/python tools/geo/cierre_fase7.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release o commit>
```
