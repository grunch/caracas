# Cierre de la fase 1 · entrega 1D

Fecha: 20-11-2026. T33j.1q. Generado por `tools/geo/cierre_fase1.py` a partir de los JSON de esta carpeta: [cierre-fase1.json](cierre-fase1.json). **Este documento cuenta lo registrado; no certifica la fidelidad del mapa ni cierra ninguna incidencia.**

## Puerta de salida (specs/08, 1D)

| Criterio | Resultado | Cumplido |
|---|---|---|
| 100 % del área recorrida | 16 sectores con barrido general y lectura individual de sus unidades; S1772-41 es rural y fluvial en el original y queda con 0 unidades a propósito | sí |
| Cada unidad clasificada y leída | 292 registros, cada uno con ocupación del original y exactamente una lectura individual (bordes 147, sin cara única 78, restantes 67) | sí |
| Hallazgos confirmados con subtarea | 12 de 12 incidencias enlazadas a subtareas de fases 2–8 (campo `subtareas` en `incidencias.json`) | sí |
| Correspondencia original ⇄ sistema por unidad | 0 aprobadas; 92 candidatos bajo el TPS, 124 sin candidato, 76 sin edificación esperada. Con residuos de hasta 96 m frente a las referencias curadas (I1772-010), ningún candidato se aprueba por cercanía | **no → T33j.2a** |
| Controles de calce independientes por sector | Solo el núcleo (S1772-22/23/32/33) tiene los 23 nodos curados; 12 sectores no tienen ninguno: S1772-11, S1772-12, S1772-13, S1772-14, S1772-21, S1772-24, S1772-31, S1772-34, S1772-41, S1772-42, S1772-43, S1772-44 | **no → T33j.2a** |

**Decisión:** la fase 1 se entrega con el inventario completo y dos criterios trasladados, con nombre, a T33j.2a. No se declaran cumplidos. El plan hacía depender 2a del «cierre de 1»; como la correspondencia aprobada y los controles por sector *son* el trabajo de 2a, esa dependencia se resuelve así y 2a puede empezar. Nada de lo pendiente autoriza a generar casas desde cajas ni a corregir geometría todavía.

## Totales censados

- Unidades: 292. Ocupación según el original: aislada 20, conjunto_especial 20, continua 89, descartada_no_edificacion 1, parcial 87, parte_de_otra_unidad 1, plaza 1, terreno_libre 73.
- Red: 85 líneas y 470 tramos candidatos ([trazado-red.md](trazado-red.md)); 32 calles curadas del núcleo con 23 cruces ([calce-y-calles.md](calce-y-calles.md)); 147 caras cerradas con 590 bordes leídos ([lectura-bordes-original.md](lectura-bordes-original.md)); 143 unidades sin cara candidata única ([contornos-sin-cara.md](contornos-sin-cara.md), [lectura-restantes-original.md](lectura-restantes-original.md)).
- Sistema medido: 1.811 huellas visibles en 1772 ([diagnostico-huellas.md](diagnostico-huellas.md)); 271 pares de cubiertas que se cortan ([cruces-cubiertas-3d.md](cruces-cubiertas-3d.md)); 32 ejes y 64 recorridos de continuidad ([continuidad-calles.md](continuidad-calles.md)); 40 frentes sondeados a pie ([accesos-primer-lote.md](accesos-primer-lote.md)).

## Cobertura por sector

La columna «Candidato TPS» cuenta unidades edificadas con alguna huella del sistema dentro de su caja bajo el calce actual; «Sin candidato», las edificadas sin ninguna. Ninguna de las dos es una correspondencia aprobada ni una omisión demostrada.

| Sector | Unidades | Ocupación (original) | Candidato TPS | Sin candidato | Sin edificación esperada |
|---|---|---|---|---|---|
| S1772-11 | 14 | aislada 2, parcial 5, terreno_libre 7 | 0 | 7 | 7 |
| S1772-12 | 9 | aislada 4, continua 2, parcial 2, parte_de_otra_unidad 1 | 1 | 7 | 1 |
| S1772-13 | 12 | aislada 2, parcial 4, terreno_libre 6 | 0 | 6 | 6 |
| S1772-14 | 6 | aislada 4, conjunto_especial 1, parcial 1 | 0 | 6 | 0 |
| S1772-21 | 19 | continua 1, parcial 11, terreno_libre 7 | 3 | 9 | 7 |
| S1772-22 | 35 | aislada 4, conjunto_especial 4, continua 21, parcial 5, terreno_libre 1 | 22 | 12 | 1 |
| S1772-23 | 35 | conjunto_especial 7, continua 17, parcial 10, plaza 1 | 23 | 11 | 1 |
| S1772-24 | 17 | aislada 1, continua 3, terreno_libre 13 | 0 | 4 | 13 |
| S1772-31 | 18 | continua 2, parcial 9, terreno_libre 7 | 1 | 10 | 7 |
| S1772-32 | 32 | conjunto_especial 4, continua 17, parcial 9, terreno_libre 2 | 22 | 8 | 2 |
| S1772-33 | 42 | conjunto_especial 2, continua 20, parcial 15, terreno_libre 5 | 20 | 17 | 5 |
| S1772-34 | 22 | aislada 3, conjunto_especial 1, descartada_no_edificacion 1, parcial 2, terreno_libre 15 | 0 | 6 | 16 |
| S1772-41 | 0 | — | 0 | 0 | 0 |
| S1772-42 | 11 | continua 3, parcial 6, terreno_libre 2 | 0 | 9 | 2 |
| S1772-43 | 18 | conjunto_especial 1, continua 3, parcial 8, terreno_libre 6 | 0 | 12 | 6 |
| S1772-44 | 2 | terreno_libre 2 | 0 | 0 | 2 |

## Calce por sector

Los GCP del ajuste miden la consistencia interna del TPS (residuo dejando uno fuera, en metros sobre 1936). Los controles independientes son los 23 cruces curados de [controles-calce-centro.json](controles-calce-centro.json); su desvío es la discrepancia I1772-010. S1772-14 no tiene ni GCP ni controles.

| Sector | GCP del ajuste | manuales | LOO rms m | LOO máx m | Controles independientes | Desvío máx m |
|---|---|---|---|---|---|---|
| S1772-11 | 3 | 0 | 5.623 | 7.99 | 0 | — |
| S1772-12 | 3 | 0 | 18.468 | 21.45 | 0 | — |
| S1772-13 | 9 | 0 | 14.244 | 20.51 | 0 | — |
| S1772-14 | 0 | 0 | — | — | 0 | — |
| S1772-21 | 20 | 0 | 14.44 | 24.06 | 0 | — |
| S1772-22 | 39 | 2 | 13.165 | 23.92 | 5 | 96.162 |
| S1772-23 | 38 | 2 | 11.947 | 18.71 | 6 | 18.378 |
| S1772-24 | 7 | 0 | 15.233 | 20.18 | 0 | — |
| S1772-31 | 9 | 0 | 14.215 | 23.0 | 0 | — |
| S1772-32 | 38 | 0 | 12.359 | 24.78 | 7 | 93.23 |
| S1772-33 | 36 | 0 | 11.446 | 21.93 | 5 | 21.177 |
| S1772-34 | 8 | 0 | 11.731 | 20.36 | 0 | — |
| S1772-41 | 2 | 0 | 11.785 | 12.14 | 0 | — |
| S1772-42 | 12 | 0 | 14.926 | 24.22 | 0 | — |
| S1772-43 | 15 | 0 | 13.801 | 19.45 | 0 | — |
| S1772-44 | 3 | 0 | 9.156 | 12.57 | 0 | — |

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

Estados `incierto` y `candidato` no son defectos confirmados y no exigen subtarea; se conservan visibles (I1772-004 y I1772-005 quedan citadas en 4b y 6a para que esas fases las resuelvan o las descarten con evidencia).

## Índice de evidencias

54 capturas locales con SHA-256, citadas por: B1772-001.json (13), accesos-primer-lote.json (4), continuidad-calles-nucleo.json (1), contraste-unidades.json (16), cruces-cubiertas-3d.json (4), sectores.json (16). Viven en `.cache/` fuera de git, como exige el plan; el JSON las enumera con el documento que las cita. Las fuentes (original y recortes) se identifican por hash en cada documento.

## Lo que la fase 1 no hizo

- No aprobó ninguna correspondencia ni trazó contornos métricos: `revision_original.contorno_metrico` sigue en `pendiente_trazado` para 291 unidades.
- No validó el calce fuera del núcleo ni midió residuos independientes por sector.
- No recorrió a pie más que los 40 frentes del primer lote; los accesos del resto se verifican en 7a.
- No publicó los datos con la corrección de I1772-006 (#88): el último release `datos-*` es anterior.

## Comprobaciones

`tools/geo/tests/test_cierre_fase1.py` (8 tests) cubre cobertura, resumen por sector, residuos, enlace de subtareas, índice de evidencias y la puerta de salida; la suite de `tools/geo` completa y `git diff --check` limpios. Sin cambios en `src/` ni en el generador.
