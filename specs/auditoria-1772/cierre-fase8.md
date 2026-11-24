# Cierre de la fase 8 · verificación integral y entrega de 1772

Fecha: 23-11-2026. T33j.8a–8c. **Cuenta lo verificado; no certifica la fidelidad histórica del mapa.**

## Qué se entrega

| | |
|---|---|
| Código | `main` en `3d2e795` (#162), el que sirve el sitio (bundle `assets/main-D2xMKRU_.js`, sin cambios locales) |
| Datos | release `datos-2026-11-23-82cd470`, desplegado en Pages |
| Comprobación | [publicado-verificado.json](publicado-verificado.json) y [conteos-publicados.md](conteos-publicados.md) |
| Ciudad de 1772 | 6279 casas a la vista |

#162 solo cambia las puertas, no lo que genera los datos. Por eso el release de 82cd470 sigue siendo el de `3d2e795`.

## Los criterios de specs/08

| Criterio | Resultado | Cumplido |
|---|---|---|
| Todos los defectos confirmados resueltos y verificados | De las 14 incidencias, 10 quedan resueltas (3 con un límite documentado), 2 corregidas y publicadas (una pendiente de revisión visual), 1 duda histórica declarada y 1 límite del calce (ver la tabla). Las fases 3 a 7 dan cerrable sobre los datos publicados. | sí, en lo medido y en planta |
| Dudas históricas declaradas | Candelaria (I1772-009), la posición del hito de Altagracia (D8-02) y dos iglesias del original sin hito ni identidad (D8-04 y D8-06). Ninguna lleva nombre ni forma sin fuente. | sí |
| Suites verdes | Sobre `3d2e795`: vitest y pytest pasan en el CI. Los E2E corrían al escribir esto (ver «Pendiente»). | sí, salvo los E2E |
| Revisión visual completa | El censo en planta de los 16 sectores contra el original está hecho ([censo-fase8.md](censo-fase8.md)), con 6 hallazgos corregidos o declarados. Las vistas oblicuas y de calle las tiene que recorrer una persona en el sitio. | **no**: falta la revisión de una persona |
| Sitio publicado comprobado con commit y datos esperados | El bundle trae `3d2e795`. El manifiesto que sirve el sitio es el del release (sha256 `38c04310…0523`). Su `ciudad.pak` (`5a2e3ed2…050f`) es idéntico al que regenera `main` desde los escaneos. Sus conteos coinciden con los registros publicados (38.921 techos y 37.407 árboles). | sí |

**La fase 8 queda cerrada en lo que se puede medir.** La única condición abierta es la revisión visual de una persona sobre el sitio publicado.

## Las 14 incidencias

| Incidencia | Qué era | Estado final | Evidencia |
|---|---|---|---|
| I1772-001 | Frente oeste abierto (M1772-0001) | resuelto, verificado en planta | Frente continuo en la ciudad publicada. Las aberturas cercanas son legítimas: el original deja solares. Fases 5 y 7 cerrables. |
| I1772-002 | Esquina suroeste abierta (M1772-0005) | resuelto, verificado en planta | Esquina cerrada. |
| I1772-003 | Frente oeste desalineado (M1772-0010) | resuelto, verificado en planta | Ninguna casa fuera de su recta (fase 5). |
| I1772-004 | Separación entre la Catedral y las casas | resuelto, verificado en planta | Las casas llegan a la planta del hito (fase 4, sin vacíos artificiales). |
| I1772-005 | Encuentro de faldones en una esquina | resuelto en la medida | Sin techos cruzados ni cumbreras desviadas ahí (fase 6, en CPU). |
| I1772-006 | Conteos del manifiesto | corregido y publicado | El manifiesto publicado coincide con el `.pak` publicado. |
| I1772-007 | Ocupación periférica omitida | resuelto, con límite | Lo edificado revisado del original (fase 4) y el censo final (D8-01). Quedan sin medir los sectores límite del calce. |
| I1772-008 | Fondo de otra época | corregido y publicado; falta la revisión visual | #157: suelo liso y calles de 1772 bajo la ciudad. |
| I1772-009 | Candelaria | duda histórica declarada | La ocupación es la del original. El hito no tiene forma en 1772, porque falta una fuente. |
| I1772-010 | Calce desplazado fuera del núcleo | resuelto, con límite | Calce por identidad (T33j.2a). S1772-14, -24 y -44 quedan en [limites-calce.json](limites-calce.json). |
| I1772-011 | Solapes entre huellas | resuelto | Lotes sin solapes (fase 5) y sin solapes residuales (fase 6). |
| I1772-012 | Cortes 3D entre cubiertas | resuelto, con límite | Techos sin cruces (fase 6). Quedan 17 contactos de esquina en [limites-fase6.json](limites-fase6.json). |
| I1772-013 | Se atraviesa la Catedral a pie | resuelto | Lo visible choca (fase 7): ningún hito se puede atravesar. |
| I1772-014 | Deformación del borde este | límite documentado | El calce de S1772-24. En el censo final, sus casas quedan corridas media cuadra. |

Cada incidencia lleva en [incidencias.json](incidencias.json) su estado y un `cierre_fase8` con la evidencia y los datos sobre los que se comprobó. Para las de un lugar concreto (I1772-001 a -005 y -013), las puertas se cruzaron con un panel de la ciudad publicada sobre el original. En los seis lugares los frentes están continuos y sin vacíos.

## Los límites documentados que entrega 1772

Cada uno tiene su registro y la decisión del responsable que lo aprobó. Los umbrales de las puertas no se ampliaron.

| Fase | Registro | Qué queda |
|---|---|---|
| 1 | [limites-calce.json](limites-calce.json) | 3 sectores del calce |
| 3 | [cierre-fase3.md](cierre-fase3.md) | 29 tramos sin medir en los sectores límite |
| 4 | [cierre-fase4.md](cierre-fase4.md) | 25 unidades sin medir y 3 contornos dudosos (U1772-0272 se resolvió en el censo final) |
| 5 | [limites-fase5.json](limites-fase5.json) | frentes vistos por una abertura, manzanas retiradas, ejes dentro de casas, casas de 1936, esquinas, la forma del original (D8-01) |
| 6 | [limites-fase6.json](limites-fase6.json) | cumbreras de esquina u oblicuas, contactos de esquina, la franja del Calvario |
| 7 | [limites-fase7.json](limites-fase7.json) | 2 huecos de edificado sin casas, 8 aberturas cuyo cierre rompería otra fase, 1 entre los brazos de la franja |

## El censo final

[censo-fase8.md](censo-fase8.md) compara los 16 sectores. 7 coinciden con el original. Los 5 que tenían hallazgos quedaron corregidos en la referencia (T33j.8c, #158):
- la franja del Calvario ya tiene sus casas;
- cuatro plazuelas quedan sin casas;
- las dos iglesias sin hito quedan como duda declarada.

[fuera-del-rojo.json](fuera-del-rojo.json) informa 346 casas casi enteras fuera del rojo del original. Son casi todas casas aisladas chicas que el calce corre unos metros. Por decisión del responsable, no hay regla en el generador.

## Pendiente

- **La revisión visual de una persona sobre el sitio publicado**, en 1772, en tinta y en color, desde arriba, en vista oblicua y a pie:
  - el fondo de época (I1772-008);
  - los seis lugares de las incidencias;
  - las plazuelas y la franja del Calvario.
- **Los E2E del CI** sobre `3d2e795`, que corrían al escribir esto.
- **Una nueva publicación** cuando un cambio toque lo que genera los datos. `npm run datos:al-dia` avisa.

## Reproducir

```
npm run datos            # o npm run datos:bajar para el release publicado
for f in 3 4 5 6 7; do .venv/bin/python tools/geo/cierre_fase$f.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos "<commit> (<release>)"; done
.venv/bin/python tools/geo/censo_fase8.py fuentes/derivados/epocas/ciudad-epocas.json .cache/censo-fase8 --informe-rojo specs/auditoria-1772/fuera-del-rojo.json
```

## Medida sobre `datos-2026-11-23-2ecbb92`

Fecha: 23-11-2026. Después del cierre se publicó `datos-2026-11-23-2ecbb92`: `main` con el convento alineado a su manzana (#166), los botones «Recorrer» (#167) y la esquina de Pajaritos con la referencia regenerada (#168). Se regeneró ese commit desde los escaneos y el `ciudad.pak` sale idéntico al publicado (`435db122…e994`). Sobre esa ciudad, las fases 3 a 7 dan cerrable:

| | Valor |
|---|---|
| Casas de 1772 a la vista | 6277 |
| Aberturas indebidas | 13, todas en límite |
| Casas desalineadas | 55, todas en límite |
| Cruces y cumbreras fuera de límite | ninguno |

Los casos nuevos que trajo el calce movido de #168 están en los límites de las fases 5 a 7, registrados por #168 con la decisión del responsable.
