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

## Reproducir

```
npm run datos            # o npm run datos:bajar (la ciudad sale de vectorizar + epocas)
.venv/bin/python tools/geo/cierre_fase3.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release>
```
