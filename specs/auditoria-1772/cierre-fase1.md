# Cierre de la fase 1 · entrega 1D

Fecha: 20-11-2026. T33j.1q. Generado por `tools/geo/cierre_fase1.py` a partir de los JSON de esta carpeta: [cierre-fase1.json](cierre-fase1.json). **Este documento cuenta lo registrado; no certifica la fidelidad del mapa ni cierra ninguna incidencia.**

## Puerta de salida (specs/08, 1D)

| Criterio | Resultado | Cumplido |
|---|---|---|
| 100 % del área recorrida | 16 sectores con barrido general registrado y todas sus unidades declaradas censadas y leídas; S1772-41 es rural y fluvial en el original y queda con 0 unidades a propósito | sí |
| Cada unidad clasificada y leída | 292 registros, cada uno con ocupación del original y exactamente una lectura individual (bordes 147, sin cara única 78, restantes 67) | sí |
| Hallazgos confirmados con subtarea | 13 de 13 incidencias enlazadas a subtareas de fases 2–8 (campo `subtareas` en `incidencias.json`) | sí |
| Correspondencia original ⇄ sistema por unidad | 292 clasificadas sobre el calce vigente por identidad ([correspondencias-identidad.md](correspondencias-identidad.md)): ausente 168, fusionada 6, incierta 6, uno_a_uno 36 (con identidad por pareja: misma celda del damero), vacio_coincide 76. U1772-0055 reclasificada como fusionada (la cuadra 8079 se reparte con U1772-0199). Muestra visual nueva de 30 recortes, atada a la clasificación vigente: 18 coinciden, 12 compatibles, 0 contradicen. Las 6 inciertas quedan visibles con decisión pendiente | sí |
| Controles de calce independientes por sector | Por decisión del responsable (21-11-2026), el LOO de cada sector con al menos 2 anclas cuenta como control independiente (cada ancla medida con un calce que no la usa); la mediana tiene que quedar bajo 15 m ([calce-identidad.md](calce-identidad.md)). Ningún cruce de damero ni nodo curado cuenta como control aparte: son anclas, caen sobre ellas o su esquina de 1936 es un rótulo. Cumplen 12 de 15 sectores con unidades. S1772-14 y S1772-44 tienen una sola ancla; S1772-24 queda en 30,8 m de mediana (deformación del dibujo de 1772 en el borde este). Los tres se revisaron sin encontrar más puntos con pareja segura | **no** → decisión pendiente |
| Candidatos de acceso recorridos a nivel de calle (1C) | 3 frentes con candidato de entrada profunda; `recorridos_calle` de [accesos-primer-lote.json](accesos-primer-lote.json) registra los 3 con conclusión: Camejo–Cruz Verde F1772-0005-3; Seminario F1772-0010-3 y Catedral F1772-0003-3, recorridos a pie el 21-11-2026 sobre `datos-2026-11-21-ce374b8`: código `ce374b8` con el mismo `ciudad.pak` que B1772-001 (`af0c664`); entre los dos commits `src/` solo cambia el Panteón (desde 1843) y los hitos de la época 1 son idénticos. En los dos se atraviesa una pared visible (I1772-003 e I1772-013 → T33j.7a) | sí |

**Decisión:** la fase 1 sigue **abierta**: `fase_1_cerrable: false` en el JSON (5 de 6 criterios). Falta:

1. **Controles de calce por sector.** Cumplen 12 de 15 sectores. S1772-14 y S1772-44 (una sola ancla) y S1772-24 (mediana 30,8 m) no tienen más puntos con pareja segura en 1936; la tolerancia no se amplía, así que quedan con decisión pendiente del responsable.

El recorrido de calle de los candidatos de acceso (1C) quedó hecho: recorridos a pie el 21-11-2026 sobre `datos-2026-11-21-ce374b8`: código `ce374b8` con el mismo `ciudad.pak` que B1772-001 (`af0c664`); entre los dos commits `src/` solo cambia el Panteón (desde 1843) y los hitos de la época 1 son idénticos ([accesos-primer-lote.md](accesos-primer-lote.md)). Seminario confirma I1772-003 (se atraviesa la fachada hacia el solar interior). Catedral abre I1772-013: las mallas de hitos no colisionan y se atraviesa su fachada. La puerta lo calcula (`accesos_recorridos_a_pie`): un frente cuenta solo con `estado: recorrido` en `recorridos_calle`.

Los controles por sector, cuando se cumplan, serán como lo pide 1B/1D (controlar cada sector), no una aprobación de geometría: localizan los defectos y miden el calce; corregirlos es la fase 2. Nada autoriza a generar casas desde cajas.

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

Los GCP del ajuste miden la consistencia interna del TPS (residuo dejando uno fuera, LOO). Un control cuenta como independiente solo si no cae a menos de 6 px de un punto del ajuste (GCP, semilla o ancla) y si su desvío se midió sobre el calce vigente. De los 23 nodos curados de [controles-calce-centro.json](controles-calce-centro.json), 22 caen sobre un punto del ajuste; el que queda guarda un desvío del calce anterior (su `config_sha256` no es el del archivo vigente). Los cruces de damero son ahora anclas del calce por identidad ([calce-identidad.md](calce-identidad.md)): su error es el LOO.

| Sector | GCP del ajuste | LOO rms m | Mediana LOO de las anclas m | Cruces de damero anclas o sobre semilla | Descartados (esquina 1936 = rótulo) |
|---|---|---|---|---|---|
| S1772-11 | 2 | 3.849 | 3.66 | 2 | 0 |
| S1772-12 | 3 | 7.025 | 1.86 | 2 | 0 |
| S1772-13 | 8 | 16.363 | 11.74 | 8 | 0 |
| S1772-14 | 1 | 145.23 | 145.23 | 0 | 0 |
| S1772-21 | 9 | 19.117 | 5.33 | 9 | 0 |
| S1772-22 | 27 | 12.578 | 11.18 | 25 | 0 |
| S1772-23 | 31 | 12.196 | 8.03 | 33 | 0 |
| S1772-24 | 5 | 38.062 | 30.76 | 3 | 2 |
| S1772-31 | 7 | 15.09 | 12.68 | 6 | 1 |
| S1772-32 | 24 | 10.971 | 8.67 | 23 | 2 |
| S1772-33 | 23 | 9.356 | 7.01 | 22 | 1 |
| S1772-34 | 10 | 19.706 | 14.7 | 9 | 2 |
| S1772-41 | 0 | — | — | 0 | 0 |
| S1772-42 | 5 | 13.894 | 8.98 | 5 | 1 |
| S1772-43 | 14 | 13.39 | 7.62 | 11 | 0 |
| S1772-44 | 1 | 61.57 | 61.57 | 1 | 0 |

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
| I1772-013 | P1 | confirmado visual | T33j.7a |

Estados `incierto` y `candidato` no son defectos confirmados y no exigen subtarea; se conservan visibles. I1772-010 sube de «desacuerdo con la referencia curada» a desplazamiento por cuadras enteras fuera del núcleo, medido en [controles-damero.md](controles-damero.md).

## Índice de evidencias

127 capturas locales con SHA-256, citadas por: B1772-001.json (13), accesos-primer-lote.json (22), continuidad-calles-nucleo.json (1), contraste-unidades.json (16), controles-calce-sectores.json (25), correspondencias-unidades.json (30), cruces-cubiertas-3d.json (4), sectores.json (16). Viven en `.cache/` fuera de git, como exige el plan; el JSON las enumera con el documento que las cita.

## Lo que la fase 1 no hizo

- No corrigió el calce ni trazó contornos métricos: `revision_original.contorno_metrico` sigue en `pendiente_trazado` para 291 unidades; el calce de control vive solo en los JSON de la auditoría, no en `tools/geo/gcp`.
- No recorrió a pie más que los 40 frentes del primer lote; los accesos del resto se verifican en 7a.
- No publicó datos: los `public/datos` locales ya no son los de la baseline B1772-001 ni los del sitio (regenerados el 20-11); publicarlos exige decidir y auditar esa pareja código/datos.

## Comprobaciones

`tools/geo/tests/test_cierre_fase1.py` (27), `test_damero.py` (9) y `test_controles_damero.py` (12); la suite de `tools/geo` completa y `git diff --check` limpios. Sin cambios en `src/` ni en el generador.
