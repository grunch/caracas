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
| D8-06 | S1772-34 (9444, 5361) | Iglesia del original, con atrio en blanco, junto al hito del Panteón (que nace en 1843). En 1772 hay casas sobre el atrio. | Iglesia sin hito en 1772. Identidad no verificada. |

**Ninguno es un fallo del generador.** Son espacios abiertos y una franja edificada que la referencia de la fase 2 no registra. Las fases 3 y 4 miden contra la referencia, así que no podían verlos. Por la regla de specs/08 («si aparece una causa anterior, abrir una subtarea de esa fase»), se corrigen en la referencia (T33j.8c). Después se regenera y se repiten las puertas.

**Las iglesias.** No se les pone nombre ni forma sin fuente: las de D8-04 y D8-06 quedan como dudas históricas declaradas hasta tener una.

## Reproducir

```
.venv/bin/python tools/geo/censo_fase8.py fuentes/derivados/epocas/ciudad-epocas.json .cache/censo-fase8
```
