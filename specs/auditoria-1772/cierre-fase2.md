# Cierre de la fase 2 · referencia histórica verificable

Fecha: 21-11-2026. T33j.2b. Generado por `tools/geo/cierre_fase2.py`: [cierre-fase2.json](cierre-fase2.json). **Este documento cuenta lo registrado en la referencia; no certifica la fidelidad del mapa ni habilita la generación.**

## Puerta de salida (specs/08, fase 2)

| Criterio | Resultado | Cumplido |
|---|---|---|
| Cada entidad corregible tiene referencia | 292 unidades del censo, 85 calles (todas las líneas del trazado) y 326 nodos (los 201 cruces del damero entre ellos) en [la red](referencia-red.md) y [las unidades](referencia-unidades.md) | sí |
| …y correspondencia | Cada unidad lleva su clase: ausente 168, fusionada 6, incierta 6, uno_a_uno 36, vacio_coincide 76 ([correspondencias-identidad.md](correspondencias-identidad.md)) | sí |
| Validadores detectan duplicados, cruces imposibles y geometría inválida | La referencia real valida. La puerta inyecta en copias un nodo duplicado, un tramo duplicado, un cruce imposible, una unidad duplicada, un anillo inválido y un solape, y el validador rechaza los seis | sí |
| Incertidumbres explícitas | 195 unidades pendientes y 158 nodos sin pareja en 1936, cada uno con su motivo. Los pendientes del propio trazado (riberas, puentes, frentes) quedan listados en el JSON | sí |
| Excepciones registradas (T33j.2b: U0036/U0151, plazas y riberas) | [1772-excepciones.json](../../tools/geo/referencias/1772-excepciones.json): 3 limite_del_calce, 3 paso_de_agua, 1 plaza, 5 trazado, 2 trazo_descartado. Todas sus unidades están en la referencia | sí |
| Datos históricos separados de las heurísticas de 1936/OSM | [procedencia-generador.json](procedencia-generador.json) clasifica cada entrada de los pasos que arman 1772; la referencia solo lee entradas históricas. Un test de vitest exige que el registro cubra exactamente las entradas de `tools/datos-pasos.mjs` | sí |
| Ninguna entidad pendiente entra al generador | El generador todavía no lee `tools/geo/referencias/`, y un test lo comprueba. 97 unidades aprobadas quedan disponibles para la fase 3 | sí |

**Decisión:** la fase 2 queda **cerrable**: `fase_2_cerrable: true`.

## Lo que hereda la fase 3

1. **Heurísticas que hoy arman 1772.** El generador sigue armando la época con estas 8 entradas no históricas:

| Paso | Entrada | Por qué es heurística |
|---|---|---|
| calles-nuevas | `fuentes/derivados/1936/segmentacion/mosaico/clases-costura.png` | Segmentación por color del plano de 1936 (manzanas, calles, edificado): geometría de 1936, no de 1772. |
| calles-nuevas | `fuentes/derivados/hoy/osm.json` | Red de calles de hoy (OpenStreetMap): sus tramos se clasifican contra 1936 y 1772, pero la red es la de hoy. |
| calles-nuevas | `tools/geo/epocas/epocas.json` | Umbrales de color, cierres y holguras de la línea de tiempo: parámetros, no lectura del original. |
| vectorizar | `fuentes/derivados/1936/segmentacion/mosaico/clases-costura.png` | Segmentación por color del plano de 1936 (manzanas, calles, edificado): geometría de 1936, no de 1772. |
| vectorizar | `fuentes/derivados/1936/tramos.json` | Tramos de OSM clasificados contra 1936 y 1772 (calles-nuevas): red de hoy filtrada, no la red del original. |
| vectorizar | `fuentes/derivados/1936/edificado-1772.png` | Lo edificado de 1772 por el color del plano calzado, con corrimiento local por correlación (calles_nuevas.llevar). |
| epocas | `tools/geo/epocas/epocas.json` | Umbrales, cierres y holguras de cada época. |
| epocas | `fuentes/derivados/1936/ciudad-1936.json` | Casas y manzanas vectorizadas de 1936: la persistencia hacia atrás parte de ellas. |

   La fase 3 (T33j.3a/3b) tiene que reemplazarlas por la referencia donde la referencia esté aprobada: calles de la red y caras desde las unidades.
2. **Unidades pendientes.** Las 195 pendientes no entran por caja ni por cercanía. Las 149 sin celda del damero se cierran en la fase 3 desde la red; las de los sectores límite y S1772-24 (I1772-014) se cierran sin ubicarlas por cercanía al calce.
3. **Excepciones.** Las [excepciones](../../tools/geo/referencias/1772-excepciones.json) no se corrigen. Se respetan: sin filas intermedias en U0185/U0186, con la calle intermedia de U0187/U0188, sin prolongar frentes sobre la Plaza de Candelaria, y con los puentes y trazos descartados fuera de la red.

No se cambiaron techos, calles generadas ni máscaras: la fase 2 no tocó el generador ni los datos publicados.

## Reproducir

```
.venv/bin/python tools/geo/referencia_red.py specs/auditoria-1772 tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json
.venv/bin/python tools/geo/referencia_unidades.py specs/auditoria-1772
.venv/bin/python tools/geo/cierre_fase2.py specs/auditoria-1772
npx vitest run tests/unit/procedencia-generador.test.js
```
