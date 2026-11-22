# Cierre de la fase 4 · ocupación de 1772 y conjuntos especiales

Fecha: 22-11-2026. T33j.4a/4b. Generado por `tools/geo/cierre_fase4.py` sobre la salida del generador: [cierre-fase4.json](cierre-fase4.json). Las casas medidas son las que viven en 1772 en `ciudad-epocas.json`, comparadas con la ocupación que el censo de la fase 1 lee en el original. **Cuenta lo medido; no certifica fidelidad.**

## Qué mide la puerta (specs/08, fase 4)

| Criterio de specs/08 | Medida |
|---|---|
| Cada frente edificado concuerda con su clasificación | **Edificadas con casas:** toda unidad leída como continua, parcial, aislada o conjunto especial tiene casas de 1772 en su interior, con una cobertura de al menos 0.05 |
| …y cada vacío | **Libres sin casas:** terreno libre, plaza y lo descartado como edificación, sin casas |
| Plazas, huertas y excepciones conservadas | **Parciales sin rellenar:** una parcial aprobada no queda cubierta más del 85 %. Las plazas entran en «libres sin casas» |
| Hitos sin dobles edificios | **Hitos sin dobles:** ninguna casa visible pisa la planta de un hito en pie en 1772. Una casa que cae en la zona de supresión del hito no se ve (`src/hitos/suprimir.js`) |

**Cómo se ubica cada unidad.**
- **Aprobada:** su anillo de la referencia, encogido 3.0 m para no contar la calle.
- **Pendiente:** su caja del original llevada a 1936 por el calce por identidad. Esta medida es **aproximada**: la caja abarca más que la unidad y el calce tiene el error de su sector. Basta para decir si tiene casas o no, pero no para medir su contorno.

Los umbrales son inferidos y van declarados en el JSON. Las 25 unidades de los sectores límite del calce (S1772-14, -24 y -44) no se miden y quedan listadas (`sin_medir_por_limite_del_calce`), como en las fases 1 y 3: ahí no se sabe ubicarlas en 1936. Los hitos salen de `src/hitos/datos` a través de `tools/hitos-planta.mjs`.

## Línea base (después de la fase 3)

| Criterio | Resultado | Cumplido |
|---|---|---|
| Edificadas con casas | 100 sin casas (52 parcial, 29 continua, 13 aislada, 6 conjunto_especial); 97 son pendientes (medida aproximada) y 3 aprobadas | **no** |
| Libres sin casas | ninguna libre con casas | sí |
| Parciales sin rellenar | ninguna parcial aprobada cubierta más del 85 % una vez descontados los patios y solares de las casas | sí |
| Hitos sin dobles | Catedral, San Francisco, Altagracia, La Pastora y Plaza Bolívar sin casas visibles sobre su planta | sí |

`fase_4_cerrable: false`, con 4146 casas visibles de 1772 (la supresión de los hitos ya aplicada).

## Causas

- **Periferia sin casas (I1772-007).** Las unidades pendientes no entran al generador por la referencia: la regla de la fase 2 prohíbe incorporarlas por caja o cercanía. Lo que el generador arma ahí sale de caras de OSM y de la máscara de color, que en la periferia casi no reconocen edificado. Para edificarlas sin romper la regla, primero tienen que tener una geometría aprobable. Eso es el siguiente PR, T33j.4a: su cara del trazado del original llevada por el calce, con el error del sector declarado.
- **Parciales rellenas.** Medidas sin descontar los patios, 22 parciales aprobadas quedaban cubiertas más del 85 %. Descontando patios y solares de las casas, ninguna pasa el umbral. Que huertas y solares del original se conserven a ojo se revisa con los conjuntos (T33j.4b).

## Después de T33j.4a: lo edificado revisado del original en el generador

Lo edificado revisado a ojo ([edificado-revisado.md](edificado-revisado.md)) entra al generador a través de la referencia (`cuadras_historicas.cargar_edificado`):

- **Pendientes edificadas de la periferia.** Lo rojo se lleva a 1936 por el calce por identidad, y cada mancha arma su cuadra de 1772 entera edificada, aunque en 1936 haya ahí un parque, una plaza o un edificio público. Una mancha no reclama manzanas de 1936. Las casas de 1936 que quedan debajo de una casa de la reconstrucción se marcan (`tapada72`) y no viven en 1772.
- **Parciales aprobadas.** Lo rojo se lleva a 1936 por la transformación de las cuatro esquinas de su anillo. El anillo decide qué manzanas de 1936 reemplaza, y las casas salen solo de las manchas rojas: las huertas del original quedan sin casas. Si ninguna mancha arma casas, el anillo no reemplaza nada.
- **Continuas aprobadas.** Lo público de 1936 dentro de ellas se edifica en 1772: es posterior, y sus techos nacen desde 1889.
- **Calles conocidas.** Los núcleos de calzada de las calles históricas verificadas (San Jacinto–Traposos y otras) entran en `calzada72`. En la ciudad final, ninguna casa de 1578 pisa el núcleo de una calle conocida en 1772.

| Criterio | Línea base | Después |
|---|---|---|
| Edificadas con casas | 100 sin casas | 5 sin casas |
| Parciales sin rellenar | 0 rellenas (22 sin descontar patios) | 0 |
| Libres sin casas | sí | sí |
| Hitos sin dobles | sí | sí |

La ciudad de 1772 pasa de 4146 a 6067 casas visibles. Los techos del pipeline suben a 39.395. Con lo edificado revisado, «edificada con casas» mide si las casas cubren al menos el 50 % de lo que el original pinta rojo; antes medía el interior entero. Así una parcial con un solo edificio chico no cuenta como vacía. La puerta de la fase 3 sigue en 5/5 sobre esta ciudad.

**Lo que queda sin casas (5).**
- **U1772-0042, U1772-0232 y U1772-0264:** dudosas en la revisión, siguen pendientes.
- **U1772-0118:** las casas cubren 0,46 de su L roja; lo que falta está en el borde, junto a la costura del mosaico.
- **U1772-0149:** su franja roja cae, por el error del calce, sobre una calle de 1772, y la regla de calzada saca esas casas.

El umbral no se baja para que pasen.

## Después de T33j.4b: conjuntos religiosos y reservas de los hitos

Antes, la supresión de los hitos en el visor (`src/hitos/suprimir.js`) escondía la casa entera en cuanto tocaba la zona de un hito. Eso dejaba **vacíos artificiales**: la Catedral escondía 2 casas casi enteras fuera de su planta (1116 m²), San Francisco 3 (870 m²) y Altagracia 1 (537 m²). Es el hueco entre la Catedral y las casas del frente norte que registra I1772-004. Cambios:

1. **Reserva de ocupación** (`vectorizar.plantas_de_1772`). La planta de cada hito en pie en 1772 (Catedral, San Francisco, Altagracia, La Pastora y la Plaza Bolívar) se resta de todas las cuadras de 1772: las de la referencia, las de lo edificado y las de las caras de OSM. Las casas se reparten alrededor de la planta, no a través de ella. Una casa de 1936 que pisa más del 10 % de su huella sobre la planta no vive en 1772 (`tapada72`).
2. **Supresión en el visor** (`pisaLaZona`). Una casa se suprime solo si lo común con la zona del hito es al menos el 25 % del más chico de los dos. La que apenas roza un hito grande sigue en pie, y la que contiene un monumento chico se suprime igual. Esto vale para todas las épocas.
3. **La puerta** usa la misma regla.
   - **Doble:** una casa visible que pisa más del 10 % de su huella sobre la planta.
   - **Vacío artificial:** una casa suprimida con más de la mitad fuera de la planta.

| Criterio | Antes de T33j.4b | Después |
|---|---|---|
| Hitos sin dobles | sí (con la supresión vieja) | sí |
| Hitos sin vacíos artificiales | 6 casas escondidas fuera de la planta | **0** |
| Edificadas con casas | 5 sin casas | 5 sin casas |

Revisé a ojo la Catedral y San Francisco sobre el mosaico: la planta queda libre y las casas llegan hasta su borde. **Candelaria** distingue sus tres cuerpos aislados de la plaza, porque son lo edificado revisado de U1772-0214: los cuerpos tienen 0,99 de cobertura y la plaza casi no tiene casas (234 de 3982 m²). Su hito sigue sin modelar en 1772 (I1772-009); delimitar su forma construida necesita una referencia histórica que no tenemos.

## Las dudosas y las reservas de calzada (T33j.4c)

Quedaban 5 edificadas sin casas. No se bajó el umbral. Se hicieron dos cambios:

1. **Dudosas corregidas a mano.** Revisé de nuevo a ojo las 8 dudosas sobre su recorte y corregí 4 ([edificado-revisado.md](edificado-revisado.md)). U1772-0042, U1772-0232 y U1772-0277 se recortan a la caja de la unidad, lo que separa el puente y lo que sigue fuera de ella. U1772-0264 se retraza con un umbral de color más bajo para tomar el edificio diagonal entero. El juicio `corregido` guarda el polígono corregido en la revisión, atado al sha256 del recorte y del trazado original. Las otras 4 (U1772-0195, -0250, -0254 y -0272) siguen dudosas y no entran con lo edificado.
2. **Reservas de calzada.** Los núcleos de calzada de las calles conocidas de 1772 se restan de las cuadras de lo edificado, igual que las plantas de los hitos. Así las casas de una mancha se reparten al borde de la calle y no a través de ella. Antes la regla de calzada borraba después la casa entera, y por eso U1772-0118 y U1772-0149 quedaban sin casas.

| Criterio | Antes de T33j.4c | Después |
|---|---|---|
| Edificadas con casas | 5 sin casas | **0** |
| Libres sin casas | sí | sí |
| Parciales sin rellenar | 0 rellenas | 0 |
| Hitos sin dobles | sí | sí |
| Hitos sin vacíos artificiales | 0 | 0 |
| Unidades medidas | sí | sí |

- La ciudad de 1772 tiene 6289 casas visibles.
- Los techos del pipeline quedan en 39.411, dentro de la tolerancia de 39.395.
- La puerta de la fase 3 sigue en 5/5 sobre esta ciudad.
- Con lo edificado revisado, la cobertura de lo rojo queda registrada en cada medida (`cobertura_del_rojo`). La más baja de las 150 es 0,69 (U1772-0023). U1772-0118 sube a 0,96 y U1772-0149 a 0,85.
- Las 4 dudosas que siguen se miden por su caja aproximada (cobertura del interior entre 0,08 y 0,34). Sus casas no salen de un contorno revisado, sino de las caras de OSM y la máscara de 1936.

## Estado de la fase 4

`fase_4_cerrable: true`, 6/6. Cumplen todos los criterios sobre las unidades medidas. Hay dos límites documentados:
- Las 25 unidades de los sectores límite del calce (S1772-14, -24 y -44) no se miden. Es la misma decisión del responsable de las fases 1 y 3.
- Las 4 dudosas que siguen no tienen contorno revisado: cumplen por la medida aproximada, no por lo rojo del original.

La regla de supresión del visor (`pisaLaZona`) vale para todas las épocas. Se revisó a ojo en 1772; en 1843–1936 todavía no.

Esta puerta cuenta lo medido; no certifica la fidelidad del mapa.

## Reproducir

```
npm run datos -- --desde vectorizar
.venv/bin/python tools/geo/cierre_fase4.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release o commit>
```
