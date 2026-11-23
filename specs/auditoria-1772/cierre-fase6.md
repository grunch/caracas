# Cierre de la fase 6 · cubiertas de 1772

Fecha: 22-11-2026. T33j.6a (I1772-005, -011 y -012). Lo genera `tools/geo/cierre_fase6.py` sobre los techos que dibuja el visor: [cierre-fase6.json](cierre-fase6.json).

Los techos los saca `tools/cubiertas.mjs`, que reproduce en CPU la geometría de `src/ciudad.js` con los pisos de 1772, sin los aleros que esconde la fachada de pretil y con el relieve en half-float, como el shader. Es el método de T33j.1l ([cruces-cubiertas-3d.md](cruces-cubiertas-3d.md)), convertido en módulo (`tools/cubiertas-lib.mjs`, con tests). No lee el GPU.

Se miden las casas que el visor deja a la vista en 1772, como en las fases 4 y 5. **Cuenta lo medido; no certifica fidelidad.**

## Qué mide la puerta (specs/08, fase 6)

| Criterio de specs/08 | Medida |
|---|---|
| Sin triángulos degenerados | **Triángulos sin degenerar:** ningún triángulo de techo con menos de 1 cm² de área, o con menos de 1 mm de altura sobre su lado mayor (una aguja). |
| Sin techos cruzados | **Techos sin cruces:** ninguna superficie de una casa atraviesa la de otra. Cuenta el corte estricto de T33j.1l: proyección común de más de 1 cm², y un plano que pasa más de 1 mm por encima y por debajo del otro dentro de ella. Los contactos de borde y los solapes coplanares no cuentan. |
| Cumbreras coherentes con el frente | **Cumbreras con el frente:** en cada frente donde la casa es fachada (los frentes de la puerta de la fase 5: rayos de cada tramo recto medible y la manzana que lo arma), la cumbrera de teja más cercana al eje tiene que ir paralela a él dentro de 20°, el giro que ya se admite para las fachadas. La casa cumple si lo hace en alguno de sus frentes. Las casas sin cumbrera de teja (azotea, zinc) no se miden. |
| Aleros sin bloquear calles | **Aleros fuera de la calle:** ningún techo pisa más de 0,01 m² del núcleo de la calzada de las calles de 1772, los corredores de la fase 3. |
| Mismo trazado y ocupación que en la fase 5 | **Mismo trazado:** las puertas 3, 4 y 5 cierran y midieron esta misma ciudad (el mismo sha256). |

Los umbrales son inferidos y van declarados en el JSON. Se fijaron antes de medir y no se cambian para que algo pase (1A).

## Línea base (después de la fase 5)

Ciudad de `main` e390f0c (#137), con 6319 casas visibles de 1772; 6317 tienen techo.

| Criterio | Resultado | Cumplido |
|---|---|---|
| Triángulos sin degenerar | **268 degenerados** de 75.215, en 165 casas | **no** |
| Techos sin cruces | **813 pares** de casas que se cortan (el mayor, 11,5 m² de proyección común) | **no** |
| Cumbreras con el frente | 4511 casas medidas; **169 desviadas** (116 giradas 80° o más: la cumbrera va de fondo, no con la calle) | **no** |
| Aleros fuera de la calle | **138 casas** con techo sobre la calzada (49 con más de 1 m²) | **no** |
| Mismo trazado que la fase 5 | las fases 3, 4 y 5 cierran sobre la misma ciudad | sí |

`fase_6_cerrable: false`.

La línea base de T33j.1l (271 pares con corte en 1811 casas) era de B1772-001. Esta ciudad tiene 6317 casas con techo: la reconstrucción de las fases 4 y 5.

## Con la Casa Amarilla (#139)

#139 sumó la Casa Amarilla como hito en pie desde 1772, y el hito esconde casas de la reconstrucción. Con los datos regenerados sobre `main` 1bf6c40 quedan 6311 casas de 1772 a la vista. Las fases 3, 4 y 5 siguen cerrables, y las 53 desalineadas siguen todas en límite.

| Criterio | Línea base (e390f0c) | Con #139 (1bf6c40) |
|---|---|---|
| Triángulos sin degenerar | 268 degenerados | 268 |
| Techos sin cruces | 813 pares | 816 |
| Cumbreras con el frente | 169 desviadas | 169 |
| Aleros fuera de la calle | 138 casas | 137 |
| Mismo trazado que la fase 5 | cumple | cumple |

## Después de T33j.6b: el techo dentro de su huella

De los 816 pares de techos que se cortan, la mayoría eran teja contra teja con las huellas sin pisarse. En una muestra de 400, en 342 el techo de una casa caía sobre la huella de la vecina.

La causa estaba en el visor. Para quitar los dientes del trazado a píxeles, `src/ciudad.js` simplificaba cada huella a 0,6 m con `simplificar`, que ajusta la recta de cada lado por separado. En la medianera, el techo de una casa se corría hasta la tolerancia sobre la de al lado. Sin simplificar, los cruces bajaban a 543, pero los dientes volvían como triángulos degenerados (905).

`simplificarAdentro` (`src/poligono.js`) solo quita vértices de cadenas que sobresalen: toda la cadena original que reemplaza la cuerda nueva tiene que quedar afuera de ella y a menos de la tolerancia del segmento, y la cuerda no toca ni corta la otra cadena. Así el polígono se achica y nunca se agranda, y el error no se acumula: ningún vértice original queda a más de 0,6 m del contorno nuevo. Los dientes que entran quedan. No cambia lotes, calles ni ocupación, y vale para todas las épocas.

| Criterio | Con #139 (antes) | Después (1bf6c40, datos sin cambios) |
|---|---|---|
| Triángulos sin degenerar | 268 | 262 |
| Techos sin cruces | 816 pares | **160** |
| Cumbreras con el frente | 169 desviadas | 167 |
| Aleros fuera de la calle | 137 casas | 137 |
| Mismo trazado que la fase 5 | cumple | cumple |

## Después de T33j.6c–6e: cumbreras, agujas y contactos

**Cumbreras con su calle (T33j.6c).** De las 167 desviadas, 131 eran casas de la reconstrucción con el marco girado 90° respecto de la calle de su frente. `alas.marco_de_casa` ponía el frente siempre en el lado libre más corto («los lotes son tiras»). En un lote casi cuadrado, o con un lado corto hacia un patio de la manzana, la cumbrera quedaba de fondo. Ahora el frente es un lado libre que da a una calle de 1772: un eje medible de `1772-calles-1936.json` que corre con el lado dentro de 20°, pasa frente a su medio y queda hacia afuera a no más de 20 m, lo mismo que mide la puerta. Entre esos lados se toma el más corto. Si ningún lado da a una calle de 1772, sigue la regla de antes.

Dos ajustes de la medida, sin tocar el giro máximo de 20°:

- En una unión en T, donde el ala lateral nace en la cumbrera del frente, las dos cumbreras quedan a la misma distancia del eje. Entre las que están a menos de 0,5 m de la más cercana gana la más paralela.
- Una casa que la puerta de la fase 5 ve fuera de la recta de un frente (vista por una abertura, ya en límite) no se mide en ese frente, porque no es su fachada.

**Sin agujas (T33j.6d).** El recorte de cada faldón con la huella dejaba vértices casi alineados, y la triangulación los volvía agujas. Además, lejos del origen, Float32 deja vértices a décimas de milímetro más allá de la cumbrera, y partir el faldón ahí dejaba una tira plana sin ancho. Ahora `sinColineales` quita, antes de triangular, los vértices a menos de 1 mm de la recta entre sus vecinos, y un quiebre se tiene en cuenta solo si el vértice lo pasa por 1 mm o más (`TOLERANCIA_CUMBRE_M`, antes 1e-6 m).

**Contactos de borde (T33j.6e, un cambio de la medida).** T33j.1l ya excluía los contactos de borde, pero con la precisión del visor dos techos que comparten la medianera se pisan décimas de milímetro. Una tira de 4 m por 0,08 mm pasaba el umbral de 1 cm², y como sobre la medianera una casa está más alta en una punta y la otra en la otra, contaba como cruce. Ahora una superficie común de menos de 1 mm de ancho, la altura mínima de la puerta, es un contacto. El umbral de área no cambia.

| Criterio | Después de T33j.6b | Después de T33j.6e (8183740) |
|---|---|---|
| Triángulos sin degenerar | 262 | **32** |
| Techos sin cruces | 160 pares | **92** |
| Cumbreras con el frente | 167 desviadas (4511 medidas) | **91** (4501 medidas) |
| Aleros fuera de la calle | 137 casas | 129 |
| Mismo trazado que la fase 5 | cumple | cumple |

Las fases 3, 4 y 5 siguen cerrables sobre la ciudad regenerada, y las 53 desalineadas siguen todas en límite.

## Después de T33j.6f: aleros fuera de la calzada

Por decisión del responsable del 22-11-2026, en las calles angostas de 1772 el alero se acorta. 129 casas tenían el alero (0,5 a 0,8 m de vuelo) sobre el núcleo de 4 m de la calzada, y en 128 la huella no pisaba la calle.

- **Generador** (`epocas.vuelos_1772`): por cada casa de 1772 a la vista, cuánto puede volar su alero sin entrar en el núcleo, que es la distancia de su huella al núcleo, porque todo el alero queda a menos de su vuelo de la huella. Lo guarda en `vuelos`, un byte por techo en centímetros (255 = sin tope): 325 casas llevan tope.
- **Pak**: `vuelos` es una parte opcional (specs/02). Un visor anterior la saltea, y la muestra del CI la recorta con los techos.
- **Visor**: el alero de la casa no pasa su tope. En las casas con tope, `alinearHuella` solo lleva a la línea de la cuadra los vértices que la pasan hacia la calle. La línea es la del marco de `vectorizar`, de antes de la alineación de la fase 5, y correr los de detrás adelantaba el techo sobre la calzada.
- **Medida**: solo cuenta como alero el techo que sale de la huella de su casa. Si la huella misma pisa la calzada (la casa 23222, 0,18 m², por debajo del umbral de la fase 3), lo mide la fase 3.

No se tocan fachadas ni ocupación.

| Criterio | Después de T33j.6e | Después de T33j.6f (9b1f5a0) |
|---|---|---|
| Triángulos sin degenerar | 32 | 39 |
| Techos sin cruces | 92 pares | 92 |
| Cumbreras con el frente | 91 desviadas | 91 |
| Aleros fuera de la calle | 129 casas | **0 (cumple)** |
| Mismo trazado que la fase 5 | cumple | cumple |

Las fases 3, 4 y 5 siguen cerrables.

## Con el Capitolio por épocas (#143)

#143 puso el Capitolio en pie desde 1772 (el convento de las Concepciones), y su planta esconde 8 casas de la reconstrucción. Con los datos regenerados sobre la mezcla de `main` 4a7cb16 en T33j.6f (dba25dd) quedan 6303 casas de 1772 a la vista y con techo, 82053 triángulos y 4495 casas con cumbrera medida. Las cuentas de la puerta no cambian: 39 triángulos degenerados, 92 pares de techos que se cortan, 91 cumbreras desviadas y aleros fuera de la calle cumple (325 casas con tope de vuelo). Las fases 3, 4 y 5 siguen cerrables, y las 53 desalineadas siguen todas en límite.

## Después de T33j.6g–6h: lotes hacia su calle, sin agujas y aleros solo sobre la calle

**El lote de la cuadra modelo hacia la calle de 1772 (T33j.6g).** `casas_por_lados` toma el marco de cada lote del lado de la cuadra en que lo reparte, sin pasar por `marco_de_casa`. 85 de las 91 cumbreras desviadas eran de esos lotes. `alas.orientar_a_una_calle` gira el marco hacia otro lado del lote si ese da a una calle de 1772 y el frente no, siempre que el lado nuevo esté libre entero en la máscara de la cuadra (`_lado_libre`, con sondas hasta cerca de las puntas). Un costado pegado a otro lote, aunque sea en parte, es medianera, y un primer intento sin ese chequeo subió los cruces de 92 a 174. La huella no cambia.

**Sin agujas (T33j.6d, segunda parte).** La triangulación puede juntar tres vértices que solo quedan alineados al sacar otras orejas, y `sinColineales` no los ve antes. El visor no emite un triángulo de techo de menos de 2 mm de alto o de menos de 2 cm², ni un alero sobre un tramo de pared sin largo. Los umbrales del visor (2 mm, también en `TOLERANCIA_CUMBRE_M`) tienen margen sobre el milímetro que mide la puerta, que lee las posiciones en Float32. El umbral de la puerta no cambia.

**El techo dentro de su huella y el alero solo sobre la calle (T33j.6h).** El marco y sus lados libres son de `vectorizar`, y la fase 5 movió casas.

- `alinearHuella` solo lleva a la línea de la cuadra los vértices que la pasan hacia la calle, en todas las casas.
- El índice del visor cuenta, para cada casa, las que viven a la vez que ella. Los lados del marco se miden libres en el visor.
- Cada tramo de pared lleva alero solo si justo afuera, hasta donde llegaría, no hay otra casa de su época.

Datos regenerados sobre la rama con el Capitolio de #143, otro hito en pie desde 1772: 6303 casas de 1772 a la vista. Las fases 3, 4 y 5 siguen cerrables, y las 53 desalineadas siguen todas en límite.

| Criterio | Después de T33j.6f | Después de T33j.6h (con #143) |
|---|---|---|
| Triángulos sin degenerar | 39 | **0 (cumple)** |
| Techos sin cruces | 92 pares | **18** |
| Cumbreras con el frente | 91 desviadas | **48** (4468 medidas) |
| Aleros fuera de la calle | 0 | 0 (cumple) |
| Mismo trazado que la fase 5 | cumple | cumple |

## Lo que sigue

- Los 18 cruces que quedan son casi todos de menos de 0,03 m²: contactos en esquinas de más de 1 mm y huellas que se pisan menos que el umbral de solapes de la fase 5.
- Las 48 cumbreras: lotes de esquina de la cuadra modelo cuyo costado hacia la calle de 1772 toca en parte otro lote, y calles oblicuas (27° a 43°) respecto de los lados de la cuadra.
- La regla de specs/08 vale: un PR de techos no cambia calles, lotes ni ocupación para que un techo deje de fallar.

## Reproducir

```
npm run datos -- --desde epocas
node tools/cubiertas.mjs
.venv/bin/python tools/geo/cierre_fase6.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release o commit>
```
