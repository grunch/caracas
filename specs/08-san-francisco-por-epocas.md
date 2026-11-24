# T41g · Iglesia de San Francisco por épocas: portada de 1745 y fachada de Hurtado Manrique

El hito `san-francisco` era una iglesia paramétrica (`iglesia` de `src/hitos/iglesias.js`) con la misma fachada
clásica y un campanario en todas las épocas. Se reemplaza por el estudio procedural de `miraflores`
(`san-francisco.html`, notas en `docs/iglesia-san-francisco.md`), siguiendo
`miraflores/docs/integracion-caracas-san-francisco.md`.

| Mapa / índice | Representación |
|---|---|
| 1772 / 1 | Templo de tres naves tras la reforma de 1745: **portada barroca de un solo portal** (tres calles, nichos con las esculturas genovesas de 1655, frontón triangular) y **campanario de tres arcos con chapitel** en el costado oeste, hacia el convento. |
| 1843 / 2 | La misma portada, ya después del terremoto de 1812, que la iglesia resistió: contrafuertes de consolidación en el costado este y paños reparados. |
| 1889 / 3 | Fachada de **Juan Hurtado Manrique** (1887–1889): tres puertas, estatuas de 1655 sobre repisas, óculo, volutas y frontón curvo partido; **sin torre campanario**. Costado este con pilastras y cornisa. |
| 1911 / 4 y 1936 / 5 | La misma envolvente: no hay reformas documentadas entre esas fechas. |

No entran 1578 (el hito nace en 1772, como antes) ni la restauración de Luis Malaussena (1953) o la declaratoria de
1956, que van solo en el «hoy» y las dudas de la ficha.

## Fuentes y límites

- Plano de 1936 (rótulo «Iglesia San Francisco») y plano de Mestre de 1889 (templo VII): ubicación y orientación.
- Litografía de hacia 1845 (`fuentes/imagenes/1845-commons-iglesia-de-san-francisco`): portada barroca y campanario
  oeste. Se aplica hacia atrás a 1772.
- [Wikipedia, Iglesia de San Francisco (Caracas)](https://es.wikipedia.org/wiki/Iglesia_de_San_Francisco_(Caracas)):
  reforma de 1745, proclamación del Libertador (1813), exequias de Bolívar (1842), fachada de Hurtado Manrique,
  jesuitas desde 1922, Monumento Histórico Nacional en 1956.
- [Commons, categoría de la iglesia](https://commons.wikimedia.org/wiki/Category:Iglesia_de_San_Francisco_(Caracas)):
  fotos de la fachada actual, cotejo de la composición desde 1889.

Las imágenes del estudio **no se copian** a este repositorio; no hay texturas, fotos ni GLB.

Son interpretativos: la huella de 62 × 19,6 m y las alturas, los alzados laterales de 1772, los contrafuertes de 1843,
el encaje del campanario con el convento y los colores. Para 1889–1936 se usa la paleta de 1936 (ocre con molduras
gris piedra); la crema de 1889 del estudio no entra, para no pagar dos tramos más (~9 mil triángulos) por un matiz
sin fuente.

## Implantación y render

- **Ancla** (8768, 7198), eje SUR, al pie de la fachada norte: la misma del hito genérico. +a entra en la nave hacia
  el sur; +b va al oeste, hacia la Universidad (el antiguo convento).
- **Orientación**: en el estudio +Z es el norte (la fachada en z = +31) y +X el oeste. El adaptador
  (`src/hitos/san-francisco.js`) usa `p.en(31, 0, 0, −π/2)`: z = +31 → a = 0, z = −31 → a = 62, +X → +b.
- **Planta**: la nave (63,5 × 22,4 m, con la portada y los contrafuertes) y el campanario (5,4 × 5,2 m al oeste de la
  fachada). **Supresión**: un rectángulo que cubre los dos, desde 1772. Con la Universidad (desde 1889) no se pisa:
  el campanario ya no está.
- Todo entra en la malla única de hitos con colores lineales; los faldones con `MAT.TEJA` (uv en metros), el resto
  con `MAT.LISO`. Se liberan las geometrías y materiales temporales.

Cambios respecto del estudio (`src/hitos/san-francisco-modelo.js`):

- Sin `optimizarPanteon` ni `aplanarGrupo`: el lienzo ya funde todo.
- `nivelDetalle: 'ciudad'` por omisión: sin plataforma ni solado, **sin interior** (pilares, arcadas, arco toral,
  retablos: cerrado por muros y cubiertas, no se ve) y sin barras de teja (las dibuja el lienzo).
- Sin la Ceiba de San Francisco: la de 1936 es de la capa de árboles (`datos/arboles.bin`).
- El tímpano trasero mira al sur, hacia afuera (test de regresión con los faldones).

### Presupuesto

| Tramo | Vida | Triángulos |
|---|---|---:|
| 1772 | [1, 2) | ~4.040 |
| 1843 | [2, 3) | ~4.110 |
| 1889–1936 (modelo de 1936) | [3, ∞) | ~4.580 |
| **Total del hito** | | **~12.700** |

La malla de hitos pasa de ~448.600 a ~460.600 triángulos (sale la iglesia paramétrica, entra el estudio): el límite
de regresión de `tests/unit/hitos.test.js` y `hitos-palacios.test.js` sube de 450.000 a **465.000**. Siguen siendo
un solo draw call; frente al presupuesto por cuadro de `specs/10-rendimiento.md` (millones de triángulos) el cambio
es despreciable.

## Información y comprobaciones

La ficha cuenta la portada de 1745, el Libertador (1813) y las exequias de Bolívar (1842), la fachada de Hurtado
Manrique y los jesuitas, con el «hoy» (Monumento Histórico Nacional desde 1956) y las dudas. La marca suma la fuente
de Wikipedia.

Pruebas unitarias (`tests/unit/hitos-san-francisco.test.js`): vidas sin huecos, cronología, posición entre las
esquinas de San Francisco y La Bolsa, al sur del Capitolio y al este de la Universidad; fachada al norte, campanario
al oeste solo en 1772–1843 y frontón partido desde 1889; ancla común; equivalencia con el modelo de cada año;
interior y Ceiba fuera en 'ciudad'; normales de faldones y tímpano; supresión y ficha. E2E
(`tests/e2e/san-francisco.spec.js`): render del rango del hito desde el noroeste en las cinco épocas y en tinta, con
el relieve compartido; capturas adjuntas.
