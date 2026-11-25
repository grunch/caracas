# Workflows de la auditoría de 1843

Los scripts de los workflows multiagente que se corrieron (herramienta Workflow de Claude Code), tal cual, para repetirlos con otra época (specs/12 § 6). Las rutas `/tmp/claude-1000/…/scratchpad/…` eran el directorio temporal de la sesión: cambiarlas por las de la sesión nueva, y los nombres de archivo y cajas por los del plano nuevo.

| Script | Agentes | Qué hace | Salida que se juntó |
|---|---|---|---|
| [esquinas-1843.js](esquinas-1843.js) | 4 (cuadrantes con solape) | Ubica cada número de esquina impreso y su cruce en píxeles del original | `esquinas-original.json` |
| [censo-1843.js](censo-1843.js) | 25 (sectores) | Censo 1B: cada manzana, lote, plaza o huerta que se centra en el sector, con el borrador como ayuda | `censo-sectores/`, `censo.json` (`tools/geo/censo_1843.py`) |
| [revision-dudosas-1843.js](revision-dudosas-1843.js) | 17 (sectores con dudosas) | Segundo lector de las lecturas dudosas: aprobada, corregida o rechazada | `revision-dudosas/`, la referencia (`tools/geo/referencia_1843.py`) |

**La leyenda** la transcribió un solo agente (no un workflow). Su encargo: leer en recortes chicos cada grupo de la leyenda (iglesias, ríos, puentes, puntos notables, calles en las dos direcciones, esquinas, parroquias con su rayado, título, escala y nota al pie) y escribir JSON con `texto_literal` (la ortografía del plano), `nombre` (desarrollado solo si es obvio) y `lectura` (segura, dudosa o ilegible), contar las esquinas y avisar de números salteados o repetidos, y marcar la pareja en el diccionario de esquinas de 1936 solo por variante obvia, con `ambigua` si hay más de una. Salida: `leyenda.json`.

**Para leer el original** sin cargarlo entero: [recorte-tiff.py](recorte-tiff.py).
