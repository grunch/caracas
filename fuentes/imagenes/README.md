# Referencias visuales

Pinturas, grabados y fotos de época que guían cómo se reconstruyen las casas de cada época
(estilos, techos, alturas, patios). Una carpeta por imagen: `<AÑO>-<fuente>-<slug>/` con
`original.<ext>` (fuera de git) y `ficha.json` (fuente, licencia, `epocas` a las que aplica: índices
0 = 1578 · 1 = 1772 · 2 = 1843 · 3 = 1889 · 4 = 1911 · 5 = 1936). Las observaciones de cada imagen
van acá, para que quien toque estilos (`tools/geo/estilos.py`), fachadas (`src/shader/fachada.js`),
techos o lotes las tenga a mano.

## 1812 · Vista de Caracas (`1812-commons-vista-de-caracas`) → épocas 1772 y 1843

Grabado a vuelo de pájaro del centro antes del terremoto, mirando al norte, con el Ávila al fondo.

- **Casas de un piso casi todas**; alguna de dos (alto con balcón) en esquinas y cerca de la plaza.
- **Techos de teja a dos aguas**, con la cumbrera **paralela a la calle**: una crujía al frente y
  otras alrededor del patio, cada una con su tejado. No hay azoteas.
- **Manzanas de corona cerrada**: las casas forman un frente continuo sobre la calle y dejan
  **patios y corrales al centro**; las de las orillas tienen solares vacíos cercados con tapia.
- **Fachadas lisas de cal**, con pocas ventanas, chicas y altas, y portones; aleros cortos.
- **Calles rectas y angostas**, de tierra, sin árboles; gente a pie.
- **Lo único alto son las torres de las iglesias** (la Catedral, de varios cuerpos con chapitel),
  que sobresalen dos o tres veces sobre los tejados.
- Hacia las orillas, **solares grandes y baldíos** con cercas, y casas sueltas.

Qué implica para el modelo: en 1772–1843, 1 piso (2 solo cerca de la plaza), tejado a dos aguas
con cumbrera paralela al frente (T33), lotes en tira con patio al fondo (lotes rectos), iglesias
con torre como hitos (T40) y calles de tierra sin arbolado.

## ~1860 (antes de 1876) · Plaza de San Pablo, grabado de C. Aagaard (`1860-blog-plaza-san-pablo-aagaard`) → época 1843

Vista a nivel de calle de la plaza donde después se hizo el Teatro Municipal. **Fecha a verificar**: llegó
como "siglo XVIII", pero el pie la atribuye a Cornelio Aagaard, que sería del XIX.

- **Plaza de tierra, sin árboles**, con una **fuente de pila al centro** rodeada de una verja baja, y
  **postes con cadena** bordeando la calle.
- **Casas de un piso con frente continuo**: paños lisos de cal, **ventanas altas y verticales con reja
  volada** que casi llegan al piso, portones, **alero** y tejado de teja con la cumbrera paralela a la calle.
- **Casas de dos pisos en las esquinas** (izquierda y derecha), con **balcón** corrido en el alto.
- Al fondo, un edificio largo de **un piso con arcada o vanos en arco** (convento u hospital) y una
  **espadaña o torre chica** de iglesia; detrás, las lomas.
- Gente a pie y a caballo; calle de tierra.

Qué implica: las plazas de 1772–1843 van de tierra con fuente y sin arbolado (los árboles de plaza llegan
con Guzmán Blanco); las ventanas coloniales son pocas pero **altas, con reja volada**; los altos con balcón
van en las esquinas; hace falta el tipo "edificio de arcada" para conventos y hospitales (T40).

## 1843 (a verificar) · Calle del centro con torre al fondo (`1843-banesco-calle-de-caracas`) → épocas 1843 y 1889

Litografía a nivel de calle, la mejor referencia de fachadas hasta ahora. **Calle, autor y fecha sin
confirmar**; la torre del fondo parece la de la Catedral.

- **Frente continuo** a los dos lados, todas las casas alineadas, **acera angosta** de losa y calzada de
  tierra o empedrado; sin árboles en la calle.
- **Casas de un piso muy altas** (5–6 m de fachada): **ventanas verticales casi de piso a techo**, con
  **reja volada sobre repisa moldurada** y guardapolvo arriba; una ventana cada 3–4 m, portón con marco.
- **Cornisa moldurada continua y alero corto** de teja; **zócalo** marcado. Algunas con **pretil y
  remates** (lado derecho): el paso de lo colonial a lo republicano.
- **Casa de dos pisos en la esquina** (izquierda): **balcón volado de madera o hierro** en el alto, alero
  ancho, ventana con reja de barrotes abajo y un adorno tallado sobre el portón.
- La **torre de iglesia** domina la calle: tres o cuatro veces la altura de las casas.
- Coche de caballos, gente a pie, un asta o poste alto.

Qué implica: subir la altura de piso de las casas del centro (≈ 5 m de fachada, no 4,2), ventanas
altas con reja volada y repisa como rasgo principal de colonial y republicano, cornisa continua, aceras
desde mediados del XIX, y dos pisos con balcón en las esquinas (no repartidos al azar).
