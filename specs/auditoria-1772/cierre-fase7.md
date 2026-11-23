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

## Después de T33j.7c–7d: aberturas cerradas con fachada y límites

**Cierre con fachada (T33j.7c).** El generador (`tools/geo/accesos.py`, `cerrar_aberturas`; lo llama
`epocas.cerrar_aberturas_1772` antes de quitar los solapes residuales) busca, junto a cada abertura indebida, lo
edificado del original que ninguna casa cubre. Fuera de los corredores de calle y de las plantas de los hitos, se lo
suma a una casa vecina de la reconstrucción. Para no deshacer otra fase:

- el cierre es una crujía de frente: llega a la línea de fachada, no la pasa y no va más de 8 m detrás de ella
  (`CIERRE_FONDO_M`);
- una casa solo cierra aberturas de la calle a la que da su frente: su marco corre con la recta, dentro del giro de
  fachada de la fase 5. Crecer por un costado le giraba la cumbrera;
- no se hace un cierre que deje alguna casa cercana sin acceso (el hueco era su zaguán) ni fuera de la recta de su
  frente: se mide igual que en las puertas de la fase 5;
- la casa que crece conserva su marco y sus alas, y el visor estira las alas del borde sobre la franja nueva. Sin
  ellos le cambiaba el techo.

Las aberturas que la puerta ya leía como hito (la estación pega en una planta) no se cierran. Con las reglas, el
generador cierra 2 aberturas. Las demás, cerradas, rompían otra fase.

**Límites documentados (T33j.7d)** ([limites-fase7.json](limites-fase7.json)), por decisión del responsable del
23-11-2026 («Límite y cerrar»). La puerta reconoce cada abertura por su tramo, su lado y su punto (a menos de 2 m) y
la cuenta como límite solo si no pasa su ancho máximo registrado. Los umbrales no cambian.

| Clase | Aberturas | Por qué no se cierra |
|---|---|---|
| `edificado_sin_casas` | 2: L1772-0011 (23 m) y L1772-0019 (39 m) | El original pinta edificado en el hueco y no hay casa que lo ocupe. Cerrarlo pide una casa nueva, que es ocupación de la fase 4. Se revisa en la fase 8 contra el original. |
| `cierre_rompe_otra_fase` | 8, de 2 a 14 m: L1772-0011, -0033, -0051, -0060, -0065, -0072 y dos en -0073 | Cerrarlo dejaría una casa sin acceso o una fachada fuera de su recta, o ninguna vecina con el frente a esa calle llega al hueco. |

Al decidir se vieron 8 de estas aberturas en capturas. Al limitar el cierre a una crujía de frente, dos huecos que
antes se cerraban hacia el fondo quedaron abiertos (L1772-0019, 39 m, y L1772-0065, 14 m). Entran por la misma
decisión, que alcanza a las aberturas que el generador no cierra sin romper otra fase, y van señaladas para la revisión
de la fase 8.

## Cierre

Datos regenerados sobre `main` con el Palacio Arzobispal de #146, un hito en pie desde 1772 (6297 casas de 1772 a
la vista). Las fases 3, 4, 5 y 6 siguen cerrables sobre la misma ciudad, y las 53 desalineadas de la fase 5 siguen
todas en límite.

| Criterio | Línea base | Al cierre |
|---|---|---|
| Sin aberturas indebidas | 12 de 64 | 10 de 63, todas en límite (cumple) |
| Casas con acceso | cumple | cumple |
| Pasajes públicos abiertos | cumple | cumple |
| Terreno libre sin casas | cumple | cumple |
| Lo visible choca | 6 hitos atravesables | 0 (cumple) |

`fase_7_cerrable: true`, 5/5 criterios, con los límites documentados de [limites-fase7.json](limites-fase7.json).
Las 38 aberturas que la fase 5 dejó como límite se volvieron a medir: sus frentes siguen en límite en la fase 5 (53
casas desalineadas, todas en límite). La mayoría son aberturas legítimas, donde el original deja un solar, y no se
cierran. Este documento no certifica la fidelidad del mapa.

## Lo que sigue (fase 8)

- Revisar contra el original los 2 huecos de edificado sin casas y las aberturas en límite.
- Los recorridos a pie de calle a interior (Seminario F1772-0010-3, Catedral F1772-0003-3), con lo visible y la
  colisión juntos.

## Reproducir

```
npm run datos -- --desde epocas
.venv/bin/python tools/geo/cierre_fase7.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release o commit>
```
