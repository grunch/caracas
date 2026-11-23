# Censo final de 1772 · fase 8

Fecha: 23-11-2026. T33j.8a. Se repite el censo de la fase 1 contra el original sobre la ciudad que dejó la fase 7 (#154, datos regenerados sobre `main` con el Palacio Arzobispal, sin publicar): [censo-fase8.json](censo-fase8.json). **Cuenta lo visto; no certifica fidelidad.**

## Método

`tools/geo/censo_fase8.py` arma un panel por sector:
- **A la izquierda**, el 1772 calzado sobre el plano base (`fuentes/derivados/1772/calzado.tif`).
- **A la derecha**, lo mismo con la reconstrucción encima:
  - las casas de 1772 a la vista, en naranja;
  - las plantas de los hitos en pie, en violeta;
  - las calles de la referencia, en verde.

La extensión de cada sector sale de lo edificado revisado de sus unidades (fase 4) y de sus tramos de calle, con 40 m de margen. Los paneles quedan en `.cache/censo-fase8/`, fuera de git. Revisé a ojo cada panel, y amplié los lugares dudosos.

## Resultado por sector

| Estado | Sectores |
|---|---|
| Coincide con el original | S1772-11, -13, -21, -22, -42, -43 |
| Coincide, con hallazgos | S1772-12, -23, -31, -32, -33, -34 |
| Límite del calce (ya documentado) | S1772-24 (I1772-014: las casas quedan corridas cerca de media cuadra), S1772-44 |
| Sin panel | S1772-14 (límite del calce: la referencia no lo cubre), S1772-41 (sin unidades localizadas: campo y río) |

## Hallazgos

| Id | Dónde (px del plano base) | Qué se ve | Causa |
|---|---|---|---|
| D8-01 | S1772-12 (7141, 7832) | La franja edificada en L junto a la calle diagonal del Calvario no tiene casas. | Ninguna unidad de la referencia cubre esa franja, así que la fase 4 no la mide (I1772-007). |
| D8-02 | S1772-23 (8765, 6173) | Plazuela de Altagracia: hay una casa en su parte oeste. La planta del hito queda dentro de la plazuela; en el original, la cruz está en la manzana del sur. | La plazuela no está en la referencia como plaza. La posición del hito queda por verificar. |
| D8-03 | S1772-23/32/33 (9350, 6940) | Espacio abierto a una cuadra al sureste de la Plaza Mayor, con casas. | No está en la referencia como plaza. |
| D8-04 | S1772-31/32 (9090, 8640) | Plazuela con una iglesia en el original, con casas encima y sin hito en 1772. | No está en la referencia como plaza. Iglesia sin identidad verificada. |
| D8-05 | S1772-32 (9281, 8409) | Espacio en blanco en el original, con casas. | No está en la referencia como plaza ni terreno libre. |
| D8-06 | S1772-34 (9444, 5361) | El signo de una iglesia (rectángulo blanco con la cruz) dentro de una manzana roja, junto al hito del Panteón (que nace en 1843). En 1772 la cubren casas genéricas. | Iglesia sin hito en 1772. No es un atrio: hay un edificio. Identidad no verificada. |

**Ninguno es un fallo del generador.** Son espacios abiertos y una franja edificada que la referencia de la fase 2 no registra. Las fases 3 y 4 miden contra la referencia, así que no podían verlos. Por la regla de specs/08 («si aparece una causa anterior, abrir una subtarea de esa fase»), se corrigen en la referencia (T33j.8c). Después se regenera y se repiten las puertas.

**Las iglesias.** No se les pone nombre ni forma sin fuente: las de D8-04 y D8-06 quedan como dudas históricas declaradas hasta tener una.

## Después de T33j.8c: los hallazgos corregidos en la referencia

- **D8-01, la franja del Calvario.** Era U1772-0272, una de las 4 dudosas de la fase 4: su caja alcanzaba dos manchas rojas. Revisada de nuevo a ojo: la mayor es su franja en L, que sigue lo dibujado en rojo; la otra es el triángulo de U1772-0013, que ya tiene sus casas (`fiel_solo_la_mayor` en [edificado-revisado.json](edificado-revisado.json)). La franja entra con la forma del original, ganchos incluidos. **Por decisión del responsable del 23-11-2026**, lo que esos ganchos dejan fuera de las puertas queda como límite de clase `forma_del_original`: 4 casas en dos frentes de la fase 5, 2 cumbreras de la fase 6 y la abertura entre los brazos de la L de la fase 7.
- **D8-02 a D8-05, las plazuelas.** Nueva referencia [1772-plazuelas.json](../../tools/geo/referencias/1772-plazuelas.json). Son cuatro plazuelas y ensanches del original, trazados a mano sobre el original ampliado ×5 y revisados a ojo; la iglesia de D8-04 no entra.
  - En 1772 ninguna casa con la mitad o más dentro vive ahí (`epocas.despejar_plazuelas_de_1772`, como al abrir una calle).
  - Son terreno vedado para alinear y para cerrar aberturas.
  - La puerta de la fase 3 las mide con las plazas.
- **D8-06** no es un espacio abierto: queda como duda histórica declarada (ver la tabla).

Datos regenerados desde `vectorizar` sobre la rama, con 6315 casas de 1772 a la vista: la franja suma 18. **Las puertas de las fases 3, 4, 5, 6 y 7 dan cerrable** sobre la misma ciudad, con los límites documentados.

## Casas fuera de lo rojo del original (informe)

**Por decisión del responsable del 23-11-2026**, se mide sin poner ninguna regla en el generador: [fuera-del-rojo.json](fuera-del-rojo.json). Se cuentan las casas de 1772 a la vista con menos del 20 % de su huella sobre lo rojo del original (`fuentes/derivados/1936/edificado-1772.png`, ensanchado 2 m). Sobre la ciudad de T33j.8c son **346 de 6315** (5,5 %):

| Sector | Casas | Sector | Casas |
|---|---:|---|---:|
| S1772-11 | 26 | S1772-31 | 32 |
| S1772-12 | 29 | S1772-32 | 59 |
| S1772-13 | 5 | S1772-33 | 24 |
| S1772-21 | 12 | S1772-42 | 24 |
| S1772-22 | 55 | S1772-43 | 13 |
| S1772-23 | 58 | S1772-24 | 9 |

`tools/geo/censo_fase8.py --informe-rojo` arma un panel de cada una de las 12 zonas de 150 m con más casas, fuera de git. Revisé a ojo las 8 primeras:
- **La mayoría** son casas aisladas chicas, corridas unos metros respecto de su propia mancha roja. Es el error del calce: una casa de 10 m corrida 4 m ya cae casi entera fuera de un rojo ensanchado 2 m. El original sí la dibuja.
- **Lo demás** son casas al borde de una franja, sobre la orilla de la calle, con el mismo corrimiento.
- **No vi** casas en lugares donde el original no dibuje nada, salvo unas pocas junto a una calle en la zona 8 ([8100, 4800, 8400, 5100] px). Esas quedan para revisar.

El número no mide casas inventadas: mide sobre todo cuánto corre el calce las casas chicas. Una regla en el generador que las quitara borraría casas que el original dibuja.

## Reproducir

```
.venv/bin/python tools/geo/censo_fase8.py fuentes/derivados/epocas/ciudad-epocas.json .cache/censo-fase8
```
