# Cierre de la fase 1 · entrega 1D

Fecha: 20-11-2026. T33j.1q. Generado por `tools/geo/cierre_fase1.py` a partir de los JSON de esta carpeta: [cierre-fase1.json](cierre-fase1.json). **Este documento cuenta lo registrado; no certifica la fidelidad del mapa ni cierra ninguna incidencia.**

## Puerta de salida (specs/08, 1D)

| Criterio | Resultado | Cumplido |
|---|---|---|
| 100 % del área recorrida | 16 sectores con barrido general y lectura individual de sus unidades; S1772-41 es rural y fluvial en el original y queda con 0 unidades a propósito | sí |
| Cada unidad clasificada y leída | 292 registros, cada uno con ocupación del original y exactamente una lectura individual (bordes 147, sin cara única 78, restantes 67) | sí |
| Hallazgos confirmados con subtarea | 12 de 12 incidencias enlazadas a subtareas de fases 2–8 (campo `subtareas` en `incidencias.json`) | sí |
| Correspondencia original ⇄ sistema por unidad | 292 clasificadas bajo el [calce de control](controles-damero.md): ausente 168, desplazada_o_parcial 6, uno_a_uno 42, vacio_coincide 76; muestra visual de 6 recortes sin contradicciones | sí, con límites |
| Controles de calce independientes por sector | 167 cruces por identidad de damero en 14 sectores más 3 hitos (Plaza Mayor, Candelaria, La Pastora); el TPS se desplaza por cuadras fuera del núcleo | sí, con límites |

**Decisión:** la fase 1 queda **cerrada**: `fase_1_cerrable: true` en el JSON. Los dos últimos criterios se cumplen como lo pide 1B/1D (clasificar cada unidad y controlar cada sector), no como aprobación de geometría: las clases y los controles localizan los defectos y miden el calce; corregirlos es la fase 2. Nada autoriza a generar casas desde cajas.

## Totales censados

- Unidades: 292. Ocupación según el original: aislada 20, conjunto_especial 20, continua 89, descartada_no_edificacion 1, parcial 87, parte_de_otra_unidad 1, plaza 1, terreno_libre 73.
- Red: 85 líneas y 470 tramos candidatos ([trazado-red.md](trazado-red.md)); 32 calles curadas del núcleo con 23 cruces ([calce-y-calles.md](calce-y-calles.md)); 147 caras cerradas con 590 bordes leídos ([lectura-bordes-original.md](lectura-bordes-original.md)); 143 unidades sin cara candidata única ([contornos-sin-cara.md](contornos-sin-cara.md), [lectura-restantes-original.md](lectura-restantes-original.md)).
- Sistema medido: 1.811 huellas visibles en 1772 en 45 cuadras ([diagnostico-huellas.md](diagnostico-huellas.md), [controles-damero.md](controles-damero.md)); 271 pares de cubiertas que se cortan ([cruces-cubiertas-3d.md](cruces-cubiertas-3d.md)); 32 ejes y 64 recorridos de continuidad ([continuidad-calles.md](continuidad-calles.md)); 40 frentes sondeados a pie ([accesos-primer-lote.md](accesos-primer-lote.md)).

## Cobertura y correspondencia por sector

| Sector | Unidades | Ocupación (original) | Correspondencia (calce de control) |
|---|---|---|---|
| S1772-11 | 14 | aislada 2, parcial 5, terreno_libre 7 | ausente 7, vacio_coincide 7 |
| S1772-12 | 9 | aislada 4, continua 2, parcial 2, parte_de_otra_unidad 1 | ausente 8, vacio_coincide 1 |
| S1772-13 | 12 | aislada 2, parcial 4, terreno_libre 6 | ausente 6, vacio_coincide 6 |
| S1772-14 | 6 | aislada 4, conjunto_especial 1, parcial 1 | ausente 6 |
| S1772-21 | 19 | continua 1, parcial 11, terreno_libre 7 | ausente 12, vacio_coincide 7 |
| S1772-22 | 35 | aislada 4, conjunto_especial 4, continua 21, parcial 5, terreno_libre 1 | ausente 22, uno_a_uno 12, vacio_coincide 1 |
| S1772-23 | 35 | conjunto_especial 7, continua 17, parcial 10, plaza 1 | ausente 23, desplazada_o_parcial 3, uno_a_uno 8, vacio_coincide 1 |
| S1772-24 | 17 | aislada 1, continua 3, terreno_libre 13 | ausente 4, vacio_coincide 13 |
| S1772-31 | 18 | continua 2, parcial 9, terreno_libre 7 | ausente 11, vacio_coincide 7 |
| S1772-32 | 32 | conjunto_especial 4, continua 17, parcial 9, terreno_libre 2 | ausente 16, uno_a_uno 14, vacio_coincide 2 |
| S1772-33 | 42 | conjunto_especial 2, continua 20, parcial 15, terreno_libre 5 | ausente 26, desplazada_o_parcial 3, uno_a_uno 8, vacio_coincide 5 |
| S1772-34 | 22 | aislada 3, conjunto_especial 1, descartada_no_edificacion 1, parcial 2, terreno_libre 15 | ausente 6, vacio_coincide 16 |
| S1772-41 | 0 | — | — |
| S1772-42 | 11 | continua 3, parcial 6, terreno_libre 2 | ausente 9, vacio_coincide 2 |
| S1772-43 | 18 | conjunto_especial 1, continua 3, parcial 8, terreno_libre 6 | ausente 12, vacio_coincide 6 |
| S1772-44 | 2 | terreno_libre 2 | vacio_coincide 2 |

## Calce por sector

Los GCP del ajuste miden la consistencia interna del TPS (residuo dejando uno fuera). Los nodos curados son los 23 de [controles-calce-centro.json](controles-calce-centro.json); los cruces-control, los de [controles-damero.md](controles-damero.md), independientes del TPS. S1772-14 no tiene cruces rectos y se controla por el hito de La Pastora.

| Sector | GCP del ajuste | LOO rms m | Nodos curados | Cruces-control | Mediana desvío TPS m |
|---|---|---|---|---|---|
| S1772-11 | 3 | 5.623 | 0 | 2 | 366.94 |
| S1772-12 | 3 | 18.468 | 0 | 2 | 309.46 |
| S1772-13 | 9 | 14.244 | 0 | 8 | 164.25 |
| S1772-14 | 0 | — | 0 | 0 | — |
| S1772-21 | 20 | 14.44 | 0 | 9 | 285.19 |
| S1772-22 | 39 | 13.165 | 5 | 25 | 96.17 |
| S1772-23 | 38 | 11.947 | 6 | 33 | 40.42 |
| S1772-24 | 7 | 15.233 | 0 | 5 | 137.61 |
| S1772-31 | 9 | 14.215 | 0 | 7 | 259.9 |
| S1772-32 | 38 | 12.359 | 7 | 24 | 95.33 |
| S1772-33 | 36 | 11.446 | 5 | 23 | 78.92 |
| S1772-34 | 8 | 11.731 | 0 | 11 | 178.88 |
| S1772-41 | 2 | 11.785 | 0 | 0 | — |
| S1772-42 | 12 | 14.926 | 0 | 6 | 250.27 |
| S1772-43 | 15 | 13.801 | 0 | 11 | 236.43 |
| S1772-44 | 3 | 9.156 | 0 | 1 | 256.38 |

## Incidencias y subtareas

| ID | Prioridad | Estado | Subtareas |
|---|---|---|---|
| I1772-001 | P1 | confirmado visual | T33j.3a, T33j.5a, T33j.7a |
| I1772-002 | P1 | confirmado visual | T33j.5a, T33j.7a |
| I1772-003 | P1 | confirmado visual | T33j.3a, T33j.5a, T33j.7a |
| I1772-004 | P1 | incierto | T33j.4b |
| I1772-005 | P1 | candidato | T33j.6a |
| I1772-006 | P1 | corregido en codigo pendiente revision y publicacion | T33j.8a |
| I1772-007 | P1 | confirmado general pendiente por unidad | T33j.3b, T33j.4a |
| I1772-008 | P1 | confirmado | T33j.8a |
| I1772-009 | P1 | identidad confirmada omision visible geometria pendiente | T33j.4b |
| I1772-010 | P0 | confirmado desacuerdo causa geometrica pendiente | T33j.2a, T33j.3b |
| I1772-011 | P1 | confirmado en datos pendiente clasificacion visual | T33j.5a, T33j.6a |
| I1772-012 | P1 | confirmado en calculo CPU pendiente inspeccion completa | T33j.6a |

Estados `incierto` y `candidato` no son defectos confirmados y no exigen subtarea; se conservan visibles. I1772-010 sube de «desacuerdo con la referencia curada» a desplazamiento por cuadras enteras fuera del núcleo, medido en [controles-damero.md](controles-damero.md).

## Índice de evidencias

109 capturas locales con SHA-256, citadas por: B1772-001.json (13), accesos-primer-lote.json (4), continuidad-calles-nucleo.json (1), contraste-unidades.json (16), controles-calce-sectores.json (25), correspondencias-unidades.json (30), cruces-cubiertas-3d.json (4), sectores.json (16). Viven en `.cache/` fuera de git, como exige el plan; el JSON las enumera con el documento que las cita.

## Lo que la fase 1 no hizo

- No corrigió el calce ni trazó contornos métricos: `revision_original.contorno_metrico` sigue en `pendiente_trazado` para 291 unidades; el calce de control vive solo en los JSON de la auditoría, no en `tools/geo/gcp`.
- No recorrió a pie más que los 40 frentes del primer lote; los accesos del resto se verifican en 7a.
- No publicó datos: los `public/datos` locales ya no son los de la baseline B1772-001 ni los del sitio (regenerados el 20-11); publicarlos exige decidir y auditar esa pareja código/datos.

## Comprobaciones

`tools/geo/tests/test_cierre_fase1.py` (9), `test_damero.py` (7) y `test_controles_damero.py` (7); la suite de `tools/geo` completa y `git diff --check` limpios. Sin cambios en `src/` ni en el generador.
