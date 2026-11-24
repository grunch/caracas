# T41d · Capitolio desde 1772: el convento de las Concepciones y el Palacio Federal Legislativo

El hito genérico nacía en 1889 con un palacio de dos pisos y una cúpula redonda y dorada (la de 1958,
anacrónica en los mapas). Se incorpora el estudio procedural aprobado en `miraflores` (`capitolio.html`),
siguiendo `miraflores/docs/integracion-caracas-capitolio.md`. El modelo es el mismo; solo se adapta al lienzo común.

| Mapa / índice | Representación |
|---|---|
| 1772 / 1 | Real Convento de la Inmaculada Concepción (fundado en 1636–1637), en toda la manzana: iglesia al norte orientada al este, campanario en la esquina de Las Monjas, portería al este, claustro principal de dos plantas, dependencias al oeste y huerta amurallada al sur. |
| 1843 / 2 | El convento reparado tras el terremoto de 1812: contrafuertes, espadaña baja en lugar del campanario y planta alta oeste reducida. La comunidad sigue allí hasta 1874. |
| 1889 / 3 | Conjunto neoclásico de Luciano Urdaneta: Palacio Legislativo al sur (1873), Palacio Federal al norte con el Salón Elíptico y las cariátides (1876–1877), patio con la fuente de 1875 y chaguaramos jóvenes. Salón con la **bóveda elíptica achatada original**. |
| 1911 / 4 | Sobrecúpula metálica belga de hierro y zinc con linterna calada, de Antonio Malaussena (1889, montada en 1890–1891). Chaguaramos más altos. |
| 1936 / 5 | La misma sobrecúpula y el mismo cuerpo; chaguaramos ya crecidos. **No** se incluye la sobrecúpula dorada de aluminio anodizado, que es de 1958: solo se nombra en el «hoy» de la ficha. |

## Fuentes y límites

- [Wikipedia, Palacio Federal Legislativo](https://es.wikipedia.org/wiki/Palacio_Federal_Legislativo) y
  [Congreso Nacional de Venezuela](https://es.wikipedia.org/wiki/Congreso_Nacional_de_Venezuela): convento,
  expropiación de la huerta (1872), exclaustración (1874), inauguraciones de 1873 y 1877, cúpula de 1958.
- [Fundación Empresas Polar, Diccionario de Historia de Venezuela](https://bibliofep.fundacionempresaspolar.org/):
  Capitolio, Luciano Urdaneta y Antonio Malaussena.
- [IAM Venezuela](https://iamvenezuela.org/) (catálogo IPC) y [Fundación Arquitectura y Ciudad](https://fundaayc.com/):
  Salón Elíptico, sobrecúpula belga y fuente de *The Crumlin Viaduct Works Company* (1875).
- Plano de Mestre de 1889 (1 «Capitolio», 2 «Palacio Federal») y plano de 1936 (cuatro alas alrededor de un jardín,
  con el óvalo en el ala norte).

El estudio se cotejó con fotografías (entre ellas, una de hacia 1930 con la linterna calada) cuya licencia de
reproducción no está verificada: **no se copian a este repositorio** ni se publican texturas, fotos ni GLB. Los
comentarios del modelo que las nombran son solo referencias. Los modelos son geometría original generada por código.

Son interpretativos: los alzados del convento (no hay levantamiento colonial), el alcance de las reparaciones
posteriores a 1812, el perfil exacto de la bóveda de 1877, la altura de los chaguaramos y las medidas finas. Las
leyendas de los planos de 1772 y 1843 siguen sin transcribir.

## Implantación y render

- **La manzana entera (T41e).** La planta y la supresión son la manzana de calle a calle: 131,4 × 123,4 m con centro en
  (8683,3, 7022,0) y eje 1,56° sobre `EJE_DAMERO` ([0,9813, 0,1927]). Se midió sobre el 1772 calzado, desde la celda
  de los ejes de la referencia (`tools/geo/referencias/1772-red.json`) hasta el borde de la manzana roja del original
  (entre 5,25 y 7 m hacia adentro de cada eje), y coincide con la línea de las manzanas vecinas del plano de 1936 (la
  Academia, el Palacio de Justicia). Antes era la huella del edificio rayado de 1936 (92 × 108 m en 8690, 7035), y en
  1772 quedaban casas en las franjas este y oeste. Hoy el conjunto, con sus jardines, también llega a la calle.
- El modelo se hizo sobre la huella nominal de 92 × 108 m, con una plataforma de 94 × 110 m. El adaptador lo estira en
  planta (`escala`, 40 % E–O y 12 % N–S; la altura no cambia) para que la plataforma llene la manzana. Solo la
  escalinata del Palacio Legislativo baja a la acera sur. Las proporciones estiradas son interpretativas.
- El modelo ya usa los ejes del marco del hito (+X este = +a, +Y arriba, +Z sur = +b, origen al centro de la manzana):
  el adaptador `src/hitos/capitolio.js` **no gira ni desplaza**; solo estira. La cúpula queda al norte (−b).
- **La terraza (T41f).** La manzana sube hasta 6,4 m de este a oeste (con la exageración del relieve), y el hito,
  plano, se apoya en la altura de su centro: el suelo le tapaba la mitad oeste. Con `terraza` (`src/relieve.js`), dentro
  de la manzana el suelo queda plano a la altura del piso, con el talud afuera, en la calle (4 m). Mientras el hito está
  en pie, el suelo bajo su plataforma no se dibuja, y el hito va 12 cm sobre su piso.
- **La terraza inclinada (T41h).** Con el piso horizontal a la altura del centro, el lado alto quedaba en un pozo: la
  manzana baja unos 8 m de la esquina noroeste a la sureste (10 m con la exageración), y en el noroeste el convento y
  el pabellón del Capitolio quedaban ~6 m bajo la calle. Ahora la terraza es el plano que mejor se ajusta al terreno de
  la manzana (mínimos cuadrados: 3,2°, 4,1° con la exageración; el terreno se aparta de él entre −0,9 y +1,9 m), y el
  hito apoya cada vértice en ese plano (`pisoDeHito`): se corre en vertical con la ladera, con las paredes a plomo, y
  techos, patios y huerta quedan apenas inclinados. Se descartó subir el piso al punto más alto: el lado bajo quedaba
  sobre un zócalo de hasta ~10 m y la escalinata del Palacio Legislativo, como un bloque. Queda: el pie de esa
  escalinata, que sale a la acera, se hunde un poco donde el terreno pasa por encima del plano.
- La escalinata del Palacio Legislativo baja unos 4,3 m sobre la acera sur (b ≈ 64,8 m, con la escala), lejos de la Universidad.
- `nace` pasa de 3 a **1**: la supresión apaga las casas genéricas de la manzana desde 1772, sin tocar su vida.
- Todas las piezas entran en la única malla de hitos con `MAT.LISO` y colores lineales, y heredan relieve,
  ola, tinta/color y sombras. Se liberan las geometrías y materiales temporales.
- Cambios mínimos al copiar el estudio (`src/hitos/capitolio-modelo.js`): sin `optimizarPanteon` (el lienzo ya funde
  todo), `nivelDetalle: 'ciudad'` por defecto y los chaguaramos del patio en su propio grupo.

### Cuerpo compartido y presupuesto

El cuerpo neoclásico es idéntico en 1889, 1911 y 1936; solo cambian la cúpula y la altura de las palmas. Se dibuja
**una sola vez** (`componente: 'cuerpo'`, vida [3, ∞)). La cúpula tiene vidas [3, 4) y [4, ∞), y las palmas
[3, 4), [4, 5) y [5, ∞). 1772 y 1843 son modelos completos. Un test comprueba que en cada época se ve
el mismo número de triángulos que el modelo completo de ese año (la visibilidad se decide por el primer vértice de
cada triángulo).

| Opción | Triángulos del Capitolio |
|---|---:|
| Cinco modelos completos (`ciudad`) | ~152.700 |
| **Cuerpo compartido (la elegida)** | **~73.000** |

Con el resto de los hitos, la malla pasa de ~355.000 a ~424.500 triángulos: el límite de regresión sube
de 400.000 a **450.000**, siempre en el mismo draw call.

## Información y comprobaciones

La marca sigue diciendo «Convento de las Concepciones» en 1772 y 1843 y «Capitolio» desde 1889. Sube a `alto: 18`
para quedar sobre la linterna. La ficha cuenta el convento, el terremoto de 1812, la obra de Urdaneta y la
sobrecúpula de Malaussena, con sus dudas.

Pruebas unitarias (`tests/unit/hitos-capitolio.test.js`): vidas sin huecos ni solapes, cronología de la cúpula,
progresión de alturas (campanario > espadaña; sobrecúpula > bóveda), cúpula al norte, extensión, ancla común,
coordenadas y normales finitas, equivalencia con el modelo completo de cada año, supresión y fichas.
E2E (`tests/e2e/capitolio.spec.js`): render del rango real del hito en las cinco épocas y en tinta, con el relieve
compartido; capturas adjuntas al resultado de Playwright.
