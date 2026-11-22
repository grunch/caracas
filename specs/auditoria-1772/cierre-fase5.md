# Cierre de la fase 5 · alineación y reparto de casas de 1772

Fecha: 22-11-2026. T33j.5a (I1772-001, -002, -003 y -011). Generado por `tools/geo/cierre_fase5.py` sobre la salida del generador: [cierre-fase5.json](cierre-fase5.json). Se miden las casas que el visor deja a la vista en 1772, sin las que suprime un hito en pie, como en la fase 4. **Cuenta lo medido; no certifica fidelidad.**

## Qué mide la puerta (specs/08, fase 5)

| Criterio de specs/08 | Medida |
|---|---|
| Todas las casas del frente comparten su recta dentro de una tolerancia numérica declarada | **Frentes alineados:** cada tramo recto medible de la red llevada a 1936 (`1772-calles-1936.json`) se mide de cada lado. Se lanza un rayo perpendicular cada 1 m, desde 8 m de cada esquina, hasta la primera casa a no más de 20 m del eje. La planta de un hito corta el rayo. Por los puntos de fachada se ajusta una recta robusta (mínimos cuadrados totales, repetidos sin los puntos lejanos). Una casa está desalineada si su desvío mediano a esa recta pasa **0,5 m**, un píxel del mosaico. La recta no tiene que ser paralela al eje, porque la fachada de 1936 puede ir oblicua a él. |
| Lotes sin solapes | **Lotes sin solapes:** ningún par de casas con área común mayor que 0,01 m² y ninguna huella inválida. Es el umbral de detección de T33j.1e; una medianera compartida tiene área común cero. |
| Ninguna casa enfrenta una medianera sin acceso | **Casas con acceso:** las casas se juntan en manzanas edificadas, cerrando los huecos de menos de 2 m. Cada casa tiene que tener al menos 2 m de borde, el ancho de una puerta, sobre el contorno exterior de su manzana. No tiene acceso una casa que solo da a un patio o a una huerta interior, ni una manzana que cae dentro del hueco de otra. |
| No se altera la calle aprobada | **Calle aprobada:** la puerta de la fase 3 sigue cerrable sobre la misma ciudad. |

Los umbrales son inferidos y van declarados en el JSON. Se fijaron antes de medir y no se cambian para que algo pase (1A). Los 29 tramos de los sectores límite del calce no se miden, como en la fase 3.

## Línea base (después de la fase 4)

Ciudad de `main` 32e6a88 (#125), con 6289 casas visibles de 1772.

| Criterio | Resultado | Cumplido |
|---|---|---|
| Frentes alineados | 569 frentes medidos con 4600 casas; **654 casas desalineadas** en 264 frentes (mediana 2,19 m; 143 hasta 1 m, 241 entre 1 y 3 m, 270 a más de 3 m) | **no** |
| Lotes sin solapes | **7195 pares** con área común (el mayor de 160,9 m²) y 1 huella inválida | **no** |
| Casas con acceso | **7 casas** sin acceso, todas de la reconstrucción de 1772 | **no** |
| Calle aprobada | la fase 3 sigue en 5/5 | sí |

`fase_5_cerrable: false`.

### De dónde salen los solapes

| Pares | Cuántos | Área común |
|---|---|---|
| Dos casas de la misma junta de la reconstrucción de 1772 | 7120 | 8825 m² |
| Dos casas de una misma cuadra de 1936 | 50 | 55 m² |
| Casa de la reconstrucción con casa de 1936 | 8 | 4 m² |
| Casa de 1578 con casa de la reconstrucción o de 1936 | 11 | 95 m² |
| Dos juntas distintas de lo edificado | 6 | 452 m² |

- **Misma junta (I011).** Es lo que T33j.1e encontró en 2350 pares sobre la ciudad de B1772-001. Ahora la reconstrucción de 1772 tiene muchas más casas: la periferia y las parciales de la fase 4. La hipótesis de T33j.1e se mantiene: el reparto raster aplica un buffer a cada lote y simplifica cada contorno por separado, y así las medianeras de dos vecinas no coinciden.
- **Dos juntas distintas.** Son las juntas 201/204 y 202/205 de lo edificado: dos manchas rojas que, llevadas a 1936, caen una sobre otra. Producen los tres solapes mayores (161, 155 y 135 m²).
- **1578.** Son casas de la ciudad de 1578 que siguen en pie en 1772 y pisan casas de la reconstrucción o de 1936.

### Lo desalineado, a ojo

Se revisó una muestra de frentes marcados sobre la planta, con las casas desalineadas en rojo.
- La mayoría son **cuñas de esquina**: casas triangulares con la fachada en diagonal, como las alas diagonales de I1772-003.
- El resto son casas corridas delante o detrás de la línea de su frente. Un rayo que entra por una abertura del frente llega a una casa del fondo, y esa casa también queda marcada; esas aberturas (I1772-001, -002) se cierran en la fase 7.

## Lo que sigue

- **T33j.5b, reparto vectorial sin solapes (I011):** medianeras compartidas en el reparto raster.
- **T33j.5c, frentes:** una línea de fachada por frente recto y las esquinas sin cuñas.
- **Las 7 casas sin acceso, las juntas superpuestas y las casas de 1578.**

En cada paso la puerta de la fase 3 tiene que seguir en 5/5 y la de la fase 4 en 6/6.

## Reproducir

```
npm run datos -- --desde vectorizar
.venv/bin/python tools/geo/cierre_fase5.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release o commit>
```
