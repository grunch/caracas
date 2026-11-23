# T41e · Palacio Arzobispal desde 1772: hipótesis colonial y reforma de 1876–1877

No había hito para el palacio: al sur de la Catedral, entre su cuerpo bajo y Las Gradillas, el mapa ponía casas
genéricas. Se incorpora el estudio procedural de `miraflores` (`palacio-arzobispal.html`, notas en
`docs/palacio-arzobispal.md`), siguiendo las secciones 2, 5 y 6 de `miraflores/docs/integracion-caracas-capitolio.md`.

| Mapa / índice | Representación |
|---|---|
| 1772 / 1 | **Palacio Episcopal** (la arquidiócesis es de 1803). Hipótesis colonial: dos plantas, vanos adintelados, balcones de hierro, alero de tejas con canes y dos patios con galerías. Los seis ejes y los dos patios se proyectan hacia atrás desde la fachada actual. |
| 1843 / 2 | La misma geometría, ya **Palacio Arzobispal**. Sin alzado fiable posterior a 1812 no se inventa una reforma. |
| 1889 / 3 | Envolvente posterior a la reforma de 1876–1877: arcos rebajados, bandas, cornisa y pretil de recuadros, leídos en la postal de Bernardo Roswaag (hacia 1920, datación de un sitio secundario). |
| 1911 / 4 y 1936 / 5 | La misma envolvente: hipótesis de continuidad, sin cambios documentados entre esas fechas. |

La vista de 2025 del estudio (alero sin pretil, amarillo, restauración de 1979–1980) **no** entra: solo se nombra en
el «hoy» de la ficha. Tampoco 1578.

## Fuentes y límites

- [IAM Venezuela / Catálogo IPC](https://iamvenezuela.org/2016/06/palacio-arzobispal/): seis vanos por nivel, dos
  accesos, patios con galerías, reforma guzmancista de la fachada y restauración de 1979–1980.
- [Arquidiócesis de Caracas, Fundación](https://arquidiocesiscaracas.com/fundacion/): erección en 1803, ejecutada en 1804.
- Postal de Bernardo Roswaag n.º 98 (reproducida por FotoGalería, que la fecha hacia 1920): marcos de arco rebajado,
  balcones de hierro, bandas, cornisa y pretil. Fotos de Commons de la fachada restaurada (seis balcones, accesos en
  los extremos).
- Plano de 1936: la manzana de la «Iglesia Catedral» con el cuerpo sur de la Catedral y, al sur, la esquina de Las
  Gradillas, sin rótulo para el palacio.

Las imágenes del estudio **no se copian** a este repositorio ni se publican (la postal no tiene licencia de
reproducción verificada); no hay texturas, fotos ni GLB. El modelo es geometría original generada por código.

Son interpretativos: la huella de 34 × 36 m y la cornisa de ~9,5 m, el alzado colonial, la fachada lateral, la
medianera, los dos patios, las cubiertas y los colores. La aplicación de la postal a 1889 y a 1936 es una hipótesis.

## Implantación y render

- **Ancla** (9096, 6917,5), `EJE_DAMERO`, en el centro del palacio. Equivale a a = 18 m, b = 55 m del marco de la
  Catedral: la fachada queda sobre la línea de la de la Catedral (el borde oeste de la manzana) y el lado sur sobre el
  borde de la manzana frente a la calle de Gradillas a San Jacinto, a unos 9 m del cuerpo sur de la Catedral. Calce
  cotejado superponiendo la planta al mosaico de 1936; la posición fina queda en `verificar`.
- **Orientación**: el estudio decía «+Z norte/plaza», pero en el plano el palacio está en el lado este de la plaza y
  mira al **oeste**. El adaptador (`src/hitos/palacio-arzobispal.js`) gira −90° (`p.en(0, 0, 0, −π/2)`): +Z del
  estudio → −a (oeste) y +X → +b (sur). Para que la fachada lateral (balcones, distribución hipotética) quede sobre la
  calle del sur y no contra la Catedral, la copia (`src/hitos/palacio-arzobispal-modelo.js`) la pasa a +X y deja la
  medianera ciega en −X (norte). Un giro no basta: el estudio la tenía del otro lado.
- **Planta y supresión**: 38,6 × 35,8 m, con los balcones sobre la plaza; no pisa la Catedral ni la plaza. La
  supresión apaga las casas genéricas desde 1772.
- Todo entra en la única malla de hitos con colores lineales; los faldones con `MAT.TEJA` (uv en metros, como las
  casas), el resto con `MAT.LISO`. Se liberan las geometrías y materiales temporales.

Cambios respecto del estudio, además del lado de la fachada lateral:

- `nivelDetalle: 'ciudad'` por omisión: sin plataforma (quedaría bajo tierra), sin enlosado del patio, sin barras de
  teja (las dibuja el lienzo), sin volutas de hierro ni cuarterones, barrotes más espaciados, la mitad de
  canes, menos balaustres y curvas con menos segmentos.
- Sin rendijas: el alero exterior baja a 9,45 m (dentro de la coronación de los muros, a 9,5 m) y entra en ellos; el
  borde del patio baja a 9,3 m y apoya en la viga de la galería; la lateral y la medianera se alargan para cubrir las
  esquinas con la fachada principal; los muros del fondo de las galerías se cruzan en las esquinas del patio.
- Los faldones van en orden a, c, b: la normal sale hacia arriba (test de regresión).
- Sin `optimizarPanteon`: el lienzo ya funde todo.

### Partes compartidas y presupuesto

Lo que cambia con la época cuelga de dos grupos con nombre: «Envolvente de la época» (las dos fachadas y todos los
muros, porque su color cambia: los del fondo de las galerías pasan ahí con `attach`) y «Cubiertas desmontables». Los
patios (galerías, arcos, pilares y pisos), iguales en todas las fechas, son el componente `comun` y se dibujan una sola
vez, vida [1, ∞). La envolvente colonial tiene vida [1, 3) y la de 1876–1877, [3, ∞). Si falta un grupo, el adaptador
falla en lugar de duplicar piezas. Un test comprueba que en cada época se ve el mismo número de triángulos que el
modelo completo de ese año.

| Parte | Triángulos |
|---|---:|
| Común (patios) | ~7.600 |
| Envolvente colonial | ~8.000 |
| Envolvente de 1876–1877 | ~8.400 |
| **Total del hito** | **~24.000** |

Con el resto de los hitos la malla pasa de ~424.600 a ~448.600 triángulos: **no** hace falta subir el límite de
regresión de 450.000, pero queda poco margen para el próximo hito.

## Información y comprobaciones

La marca dice «Palacio Episcopal» en 1772 y «Palacio Arzobispal» desde 1843; la ficha cuenta la hipótesis colonial, la
arquidiócesis de 1803, la reforma de 1876–1877 y la continuidad hasta 1936, con la restauración de 1979–1980 en el «hoy»
y sus dudas. El buscador lo llama «el Palacio Arzobispal» (alias «Palacio Episcopal», «Arzobispado»): ahora es la
referencia más cercana de la esquina de Las Gradillas y de la Catedral, y se ajustaron esos dos ejemplos de
`tests/unit/buscador-prosa.test.js`. La nota de la Catedral sobre el muro largo hasta Gradillas nombra el palacio.

Pruebas unitarias (`tests/unit/hitos-palacio-arzobispal.test.js`): vidas sin huecos, cronología sin fechas modernas,
posición respecto de la plaza, la Catedral y Las Gradillas, fachada de balcones al oeste y lateral al sur, ancla común,
coordenadas y normales finitas, equivalencia con el modelo completo de cada año, separación de componentes (y error si
falta un grupo), normales de los faldones, supresión y ficha. E2E (`tests/e2e/palacio-arzobispal.spec.js`): render del
rango del hito desde el suroeste en las cinco épocas y en tinta, con el relieve compartido; capturas adjuntas.
