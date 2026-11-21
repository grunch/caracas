# Red de la referencia histórica de 1772 · fase 2

Fecha: 21-11-2026. T33j.2b, primera parte (specs/08, fase 2: referencia histórica verificable). Generado por `tools/geo/referencia_red.py` a partir del trazado del original y del calce por identidad vigente: [`tools/geo/referencias/1772-red.json`](../../tools/geo/referencias/1772-red.json). **Valida la coherencia de la red, no su fidelidad: los ejes son aproximados, sin anchos, y no habilitan la generación (eso es la fase 3).**

## Qué contiene

- **326 nodos, cada intersección con un solo ID.**
  - 201 cruces del damero (conservan su `X1772-…`).
  - 21 encuentros fuera del damero (`E1772-…`): calles quebradas, caminos y plazas.
  - 104 extremos sueltos de una línea (`T1772-…`).
- **85 calles**, una por línea del trazado ([trazado-calles-original.json](trazado-calles-original.json)), cada una como la secuencia de sus nodos en el orden del dibujo: 70 calle_recta, 7 calle_quebrada, 4 camino, 2 circulacion_espacio_abierto, 1 circulacion_borde_abierto, 1 acceso_sin_salida. En total, 467 tramos entre nodos consecutivos.
- **Pareja en 1936 solo por identidad.** 168 cruces tienen `mosaico`: las anclas del calce por identidad ([calce-identidad.md](calce-identidad.md)) y los 4 cruces que caen sobre las semillas de la Plaza Mayor. Ningún nodo toma su pareja de la proyección del calce. Los demás quedan `sin_pareja_segura` con su motivo:

| Motivo | Nodos |
|---|---|
| Extremo del trazado sin cruce | 104 |
| Encuentro fuera del damero | 21 |
| Sin esquina con nombre en 1936 ni pareja por topología (cruces de los bordes) | 13 |
| La esquina de 1936 asignada es un rótulo, no un cruce | 9 |
| Pareja por topología rechazada a ojo ([anclas-topologia.json](anclas-topologia.json)) | 11 |

La huella del calce (`huella_calce`) y el SHA-256 del trazado quedan en el JSON: si cambian, hay que regenerar la red.

## Qué valida `validar_red`

- **Duplicados:** IDs y coordenadas únicos (dos IDs para el mismo cruce se rechazan); un mismo tramo no puede aparecer en dos calles.
- **Cruces imposibles:** dos tramos que se cortan sin nodo compartido, en el original y, entre nodos identificados, en 1936.
- **Orden de calles igual al original:** a lo largo de cada calle recta con 3 o más cruces identificados, y en el giro de cada esquina entre dos calles distintas (un pliegue del calce lo invierte).
- **Procedencia y estado:** cada nodo declara su procedencia; uno identificado necesita su pareja en 1936, y uno sin pareja necesita su motivo y no lleva mosaico. Ninguna calle usa un nodo inexistente y ningún nodo queda suelto.

La red real pasa todas estas comprobaciones.

## Relación con el contrato del núcleo

[contrato-referencia.md](contrato-referencia.md) (`1772-nucleo.json`, 23 nodos `N1772-…` y 10 unidades) sigue vigente como contrato de las unidades. Esta red es su base para toda la ciudad: las unidades de la referencia completa (siguiente PR de T33j.2b) se cierran sobre estos nodos, y así los lados que comparten dos unidades son los mismos tramos.

## Reproducir

```
.venv/bin/python tools/geo/referencia_red.py specs/auditoria-1772 tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json
.venv/bin/python -m pytest tools/geo/tests/test_referencia_red.py -q
```
