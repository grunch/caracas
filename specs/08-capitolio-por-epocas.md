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

- Se conservan el ancla (8690, 7035) del plano de 1936, `EJE_DAMERO` y la huella de 92 × 108 m (planta y supresión).
- El modelo ya usa los ejes del marco del hito (+X este = +a, +Y arriba, +Z sur = +b, origen al centro de la manzana):
  el adaptador `src/hitos/capitolio.js` **no gira ni desplaza**. La cúpula queda al norte (−b).
- La escalinata del Palacio Legislativo baja unos 3,8 m sobre la acera sur (b ≈ 57,8 m), lejos de la Universidad (b ≈ 78 m).
- `nace` pasa de 3 a **1**: la supresión apaga las casas genéricas de la manzana desde 1772, sin tocar su vida.
- Todas las piezas entran en la única malla de hitos con `MAT.LISO` y colores lineales, y heredan relieve,
  ola, tinta/color y sombras. Se liberan las geometrías y materiales temporales.
- Cambios mínimos al copiar el estudio (`src/hitos/capitolio-modelo.js`): sin `optimizarPanteon` (el lienzo ya funde
  todo), `nivelDetalle: 'ciudad'` por defecto y los chaguaramos del patio en su propio grupo.

### Cuerpo compartido y presupuesto

El cuerpo neoclásico es idéntico en 1889, 1911 y 1936; solo cambian la cúpula y la altura de las palmas. Se dibuja
**una sola vez** (`componente: 'cuerpo'`, vida [3, ∞)). La cúpula tiene vidas [3, 4) y [4, ∞), y las palmas
[3, 4), [4, 5) y [5, ∞). 1772 y 1843 son modelos completos. Un test comprueba que en cada época se ven
exactamente los triángulos del modelo completo de ese año (sin piezas omitidas ni duplicadas).

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
