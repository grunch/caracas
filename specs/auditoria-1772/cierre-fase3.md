# Cierre de la fase 3 · calles y límites de manzana

Fecha: 21-11-2026. T33j.3a/3b. Generado por `tools/geo/cierre_fase3.py` sobre la salida del generador: [cierre-fase3.json](cierre-fase3.json). Las casas medidas son las que viven en 1772 en `fuentes/derivados/epocas/ciudad-epocas.json` (el JSON guarda su SHA-256 y el release de datos de donde salen), contra la [referencia histórica](cierre-fase2.md) de la fase 2. **Cuenta lo medido; no certifica fidelidad.**

## Qué mide la puerta (specs/08, fase 3)

| Criterio de specs/08 | Medida |
|---|---|
| Red conectada como el original; ningún frente ocupa una calle | **Calles libres:** ninguna casa de 1772 pisa (más de 1 m²) el núcleo de calzada de un tramo recto entre dos cruces identificados de la referencia |
| San Jacinto y los casos inventariados con separación correcta | **Calles históricas libres:** las 11 de `calles-historicas.json`, con San Jacinto–Traposos, sin casas en su núcleo de calzada |
| No se crean calles en plazas | **Plazas sin casas:** las plazas aprobadas, sin casas dentro |
| No se crean calles en patios | **Sin calles dentro de unidades:** ninguna unidad aprobada continua cruzada de lado a lado por una franja sin casas que tenga casas a los dos lados |

**El núcleo de calzada mide 4 m. Es un ancho inferido, no medido:** el original no da anchos. Es lo mínimo que ninguna calle de 1772 deja de tener, y es angosto a propósito, para que el error del dibujo no se cuente como casa sobre la calle. Solo se miden los tramos con sus dos cruces identificados en 1936: en los demás, la referencia no sabe por dónde pasa la calle en 1936.

## Línea base (generador antes de la fase 3, `datos-2026-11-21-e70c35f`)

| Criterio | Resultado | Cumplido |
|---|---|---|
| Calles libres | 61 de 259 tramos con casas sobre el núcleo de calzada (S1772-22 18, S1772-23 19, S1772-32 10, S1772-33 10, S1772-43 4) | **no** |
| Calles históricas libres | 11 medidas, ninguna ocupada | sí |
| Plazas sin casas | la Plaza Mayor, sin casas | sí |
| Sin calles dentro de unidades | 3 medianas libres en U1772-0203, U1772-0204 | **no** |

`fase_3_cerrable: false`, con 2708 casas de 1772 medidas.

**Causa de las calles ocupadas.** Revisé recortes del mosaico, fuera de git, en Padre Sierra–La Bolsa y en San Jacinto. Las cuadras de 1772 salen de las caras de la red de OSM ajustadas a las fachadas de 1936 (`vectorizar._cuadras_de_antes`), y la máscara del edificado por color decide si se construyen. Donde esa cara no coincide con la manzana del original, el reparto deja un abanico de casas triangulares que llega hasta el eje de la calle. Es la cara histórica contaminada de I1772-001 e I1772-003 (T33j.3a).

## Después de T33j.3a: las cuadras de 1772 desde la referencia aprobada

El generador ahora lee la referencia histórica. Lo hace solo por `cuadras_historicas.cargar_referencia`, que deja fuera las pendientes.

1. **Cuadras de la referencia** (`vectorizar._cuadras_de_referencia`). Cada unidad aprobada edificada arma su cuadra de 1772 con su anillo de ejes de calle como cara.
   - `ajustar_cara` aparta los lados hasta las fachadas, a 3 m como mínimo; si no hay fachadas, el anillo se encoge 3 m.
   - Una cuadra continua vuelve a edificar lo abierto de 1936, como los pasajes modernos. Las demás conservan lo abierto.
   - Cada manzana de 1936 sobre la referencia pasa a la unidad que más la cubre, y sus casas de 1936 no viven en 1772.
   - El grupo cede a 1936 en 1843 (`juntas_hasta`), porque la referencia solo describe 1772.
   - Una cara de OSM con el 30 % o más sobre la referencia ya no arma otra cuadra.
2. **La calle manda sobre la casa heurística.**
   - `vectorizar.marcar_calzada` marca (`calzada72`) las casas que pisan el núcleo de calzada de una calle de la referencia.
   - `epocas` no las deja vivir en 1772: una casa de 1936 nace desde 1843, y una «de antes» se quita.
3. **Calles históricas medidas sobre la referencia.** El eje de una calle de `calles-historicas.json` pasa por los cruces de la referencia que hay entre sus extremos en el original, si todos tienen pareja. Antes se trazaba por sus anclajes, que se habían ajustado a la red de OSM y se apartan hasta unos 7 m. Así se miden 10 de las 11.

| Criterio | Línea base | Después | Cumplido |
|---|---|---|---|
| Calles libres | 61 de 259 tramos ocupados | 0 de 259 | sí |
| Calles históricas libres | ninguna ocupada (medidas por anclajes) | ninguna ocupada (10 sobre la referencia) | sí |
| Plazas sin casas | sí | sí | sí |
| Sin calles dentro de unidades | 3 medianas libres | 0 | sí |

`fase_3_cerrable: true` sobre la ciudad regenerada (SHA-256 en el JSON), con 4217 casas de 1772; en la línea base eran 2708. Las casas nuevas son las de las unidades aprobadas que el original dibuja edificadas y el generador no construía (las `ausente` de la fase 2). Los techos del pipeline suben de 35.022 a 37.699 (`tools/datos-esperados.json`).

Revisé a ojo, sobre el mosaico, el núcleo y San Jacinto:
- Las cuadras de la referencia se reparten en lotes alineados con sus calles y las calles quedan libres. La Plaza Bolívar está vacía.
- San Jacinto–Traposos sigue abierta.

Lo que todavía no mide esta puerta:
- **Unidades pendientes.** Las 195 pendientes de la referencia, sobre todo en la periferia, se siguen armando con caras de OSM y la máscara de color, y los tramos de la red sin pareja en 1936 no se miden. Es T33j.3b.
- **Hitos.** Los lotes sobre hitos como la Catedral ya estaban en las cuadras curadas de #69. Los dobles edificios son I004/I009 (fase 4).

## Reproducir

```
npm run datos            # o npm run datos:bajar (la ciudad sale de vectorizar + epocas)
.venv/bin/python tools/geo/cierre_fase3.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release>
```
