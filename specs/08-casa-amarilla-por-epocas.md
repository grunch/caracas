# T41c · Casa Amarilla desde 1772

El modelo genérico nacía en 1889 y omitía el antecedente colonial. Se incorpora el estudio procedural
original aprobado por el usuario en `miraflores`, con las dos revisiones de la portada lateral.

| Mapa / índice | Representación |
|---|---|
| 1772 / 1 | Ayuntamiento al sur y cárcel al norte, dos plantas, dos patios interpretativos, corral y casamata posterior. El solar de un cuarto de manzana no se trata como superficie totalmente edificada. |
| 1843 / 2 | Casa de Gobierno reunida, fachada sobria, balcones y tejados. Bolet (1870) orienta retrospectivamente la silueta. |
| 1889 / 3 | Fachada amarilla, patio de arcadas, pabellón sur con puerta única y tres vanos pequeños sobre un balcón común. Se incluyen molduras, pilastras, rosetas, clave, talla simplificada, herrería, balaustres y bandera. |
| 1911 / 4 | Misma envolvente; cambia la disposición de las estrellas. No se anticipa la asignación completa a Cancillería en 1912. |
| 1936 / 5 | Cubiertas mixtas: se sustituye la trasera por platabanda de ubicación hipotética. No se incorpora la ampliación de 1938. |

1810 se explica en la ficha del Ayuntamiento; no se añade un mapa ni se alteran los índices existentes.

## Fuentes y límites

- [Wikipedia, Casa Amarilla](https://es.wikipedia.org/wiki/Casa_Amarilla_de_Caracas): solar original,
  Ayuntamiento terminado en 1750, hechos de 1810, daños de 1812, reunión inaugurada en 1842 y reforma de 1874.
- [Fundación Empresas Polar, Casa Amarilla](https://bibliofep.fundacionempresaspolar.org/dhv/entradas/c/casa-amarilla/):
  cárcel de dos pisos en la representación de 1766, solares posteriores y casamata; pintura amarilla
  en 1877, reformas de cubierta de 1930 y 1957, ampliación de 1938.
- [IAM Venezuela, catálogo IPC](https://iamvenezuela.org/2016/07/casa-amarilla/): dos niveles, patio
  de corredores con arcadas, cornisa y remate circular.
- [Fundación Empresas Polar, Bandera Nacional](https://bibliofep.fundacionempresaspolar.org/dhv/entradas/b/bandera-nacional/):
  siete estrellas; seis alrededor de una central en 1889, circunferencia en 1911 y arco en 1936.

Se cotejaron la pintura atribuida a Bolet, litografía de H. Neun, axonometría y fotografías del estudio
original. `puerta-arcos-1.png` y `puerta-arcos-2.png` muestran la puerta tallada, las tres
puertas-ventanas arqueadas del balcón, los relieves y el pretil. `bandera.png` orienta la posición del asta.
Las fotos modernas afinan formas, **no prueban la fecha de cada adorno**. No se transcribe la inscripción
ilegible de la placa ni se reproduce la heráldica en detalle. Los mascarones y la talla vegetal son
aproximaciones originales, no escaneos escultóricos.

Las imágenes nuevas tienen licencia de reproducción sin verificar: no se copian a este repositorio,
ni se publican fotografías, texturas o GLB. Las referencias ya catalogadas conservan sus fichas.
Los modelos son geometría original generada por código, bajo la licencia del repositorio.

Medidas, linderos coloniales, alzados tempranos, patios, casamata y distribución posterior siguen siendo
interpretativos. La ubicación de la platabanda de 1930 es una hipótesis. Las fuentes discrepan sobre
el orden de las columnas; se representan capiteles simplificados sin resolver esa atribución.

## Implantación y render

- Se conserva el ancla del hito anterior: (8822, 6770) píxeles del plano de 1936 y `EJE_DAMERO`.
- El estudio tiene 46 m de fachada y 54 m de profundidad nominales; no es un levantamiento acotado.
  El adaptador gira +π/2: `(x,y,z)` del modelo → `(z,y,−x)` del marco. El frente mira al este hacia la plaza;
  el pabellón de tres vanos queda al sur y la esquina de Principal al norte.
- Planta/supresión: 57 × 50 m, con plataforma, aleros y vuelos. Cambia respecto al rectángulo genérico
  anterior, que tenía invertidas las dimensiones respecto al frente del estudio. No pisa otros hitos.
  El calce fino contra cada plano, especialmente los linderos coloniales, sigue pendiente de verificación.
- Se suprimen las casas genéricas del solar desde índice 1, preservando su vida anterior.
- Todas las piezas se integran a la única malla de hitos con `MAT.LISO`, colores lineales y normales
  transformadas. Comparten relieve, ola, tinta/color y sombras; se liberan geometrías y materiales temporales.
- La envolvente de 1889 se guarda **una sola vez** hasta el final. Las cubiertas tienen vidas [3,5)
  y [5,∞), y cada bandera su propia época. En 1772 y 1843 hay modelos completos independientes.
  Así no se triplica la fachada detallada ni se dibujan dos envolventes en una misma fecha.
- Curvas y ornamentos usan menor teselación que el estudio; se conservan las formas aprobadas.
  Presupuesto: <220.000 triángulos para todas las etapas de Casa Amarilla y <400.000 para todos los hitos.

## Información y comprobaciones

Las marcas cambian de «Ayuntamiento y Real Cárcel» a «Casa de Gobierno» y «Casa Amarilla». Las fichas
incluyen el episodio de 1810, cronología, fuentes y dudas; la página edificio por edificio las recibe
sin lógica nueva.

Pruebas unitarias: vidas de cada componente, ancla común, orientación de la bandera y fachada,
coordenadas finitas, presupuesto, ausencia de solapes con otros hitos, supresión y nombres/textos.
E2E: render del rango real de la Casa Amarilla con el material de ciudad en cinco épocas y tinta,
verificando cambio de cubiertas, enseñas y relieve compartido; capturas adjuntas al resultado de Playwright.
Se ejecutan además Vitest, Playwright, pytest geográfico y build antes de publicar el PR.
