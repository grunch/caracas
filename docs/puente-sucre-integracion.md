# Puente Constitución y Puente Sucre metálico

Avance de [#272](https://github.com/grunch/caracas/issues/272): el cruce del Guaire al término de la calle Sur 7.
Usa el adaptador de puentes de [`puente-hierro-integracion.md`](puente-hierro-integracion.md) sin cambiarlo. No
cierra el issue.

## Por época

| Época | Qué se ve | Fuente de la vida |
|---|---|---|
| 1772, 1843 | Nada: no hay puente | — |
| 1889 | **Puente Constitución** (Juan Hurtado Manrique, 1880–1881): tablero bajo de vigas rectas en tramos cortos, barandas y piso de madera. Los dos apoyos son del estudio | Silva Contreras, p. 34 y fig. 10; plano de Mestre, n.º 15 |
| 1911 | **Puente Sucre** (José María Ortega Martínez, 1895): armadura superior tipo *bowstring*, 60 m de luz, sin apoyos | Silva Contreras, p. 34 y figs. 11–13 (pp. 35–36); plano de Razetti, n.º I |
| 1936, 1946 | Nada dibujado. El cruce existe (puente de concreto de H. Ayala), pero no tiene alzado. La marca y la ficha siguen; no se reserva un vacío | Silva Contreras, nota 11 (p. 42); planos DCN de 1936 y 1946, rótulo «Puente Sucre» |

El Constitución cayó con la crecida de octubre de 1892 y el Sucre se terminó en 1895 (Silva Contreras, p. 34). El
sitio no tiene una época entre 1889 y 1911: ese intervalo sin puente no se ve.

El Sucre metálico se desmontó cuando se hizo el de concreto y se llevó a la Gran Carretera Oriental: 1925 según
Silva Contreras (nota 11, con la Memoria del MOP de 1926), 1930 según
[FAC](https://fundaayc.com/2022/09/08/1924-inauguracion-del-puente-ayacucho/). Las dos fechas son anteriores al
plano de marzo de 1936, así que en 1936 no va.

## Calce

Un solo paso para las dos estructuras. Píxeles del mosaico de 1936 (0,5 m/px); los números completos están en
[`puente-sucre-calce.json`](puente-sucre-calce.json).

| Qué | Valor | De dónde sale |
|---|---|---|
| Eje | Pasa por (9718,0, 9340) y (9703,4, 9460) | El medio de los dos bordes de la calzada del plano de 1936, releído entre esas dos alturas (recorte ×12, rejilla de 20 px; ±1 px) |
| Cabeza norte | (9713,5, 9377,3) | El medio de los pedestales del norte de Razetti (1911), (9703, 9376), llevado a ese eje |
| Cabeza sur | (9699,0, 9496,4) | A 60 m de la norte: la luz documentada del Sucre |
| Centro | (9706,3, 9436,9); en el mundo, x = 369 m, z = 1299 m | — |
| Cotas | 872,9 m (norte) y 872,7 m (sur); pendiente 0,3 % | `public/datos/relieve.bin` |
| Error | 7 m | RMS del calce de Razetti (6,71 m) y la lectura |

### Tres decisiones, y por qué

1. **El eje se releyó.** El primer calce ([`puentes-guaire-calce.md`](puentes-guaire-calce.md)) lo da por
   (9704, 9440) con dirección (−0,096, 0,995), medido sobre un tramo largo de la calle. La calle tuerce: a la
   altura de la cabeza norte ese eje queda 2 m al oeste del medio de la calzada. Acá importa, porque al este hay un
   lote a 1 m del eje.
2. **La cabeza norte es la de Razetti, no la de Mestre.** El aviso del primer calce era que Razetti dibuja el Sucre
   de 48 m y su luz documentada es de 60 m. Se resolvió así: de Razetti se toma solo la cabeza norte, y el largo es
   el documentado. Los pedestales del sur de Razetti quedan 12 m antes de la cabeza sur.
3. **El símbolo de Mestre da el largo del Constitución, no su lugar.** Mestre dibuja el puente a escala (60,7 m; el
   estudio trae 59,56 m), pero 19 m más al norte: de y = 9338 a 9458. Eso es más que el error de su calce (RMS
   7,64 m; p90 12,93 m; máximo 19,16 m). No se puso ahí por dos razones medidas:
   - En 1889 el sitio tiene una manzana al este de la calle hasta y ≈ 9370–9380 (el lote 4255 de `ciudad.pak`, que
     vive desde 1843). Mestre no la dibuja. Con las cabezas de Mestre, los 17 m del norte del tablero quedarían
     dentro de ese lote entre 1,9 y 2,8 m. Ningún hito va encima de una manzana.
   - El suelo de la ciudad pinta el río del plano de 1936 en todas las épocas: sobre el eje, y = 9422–9445. Mestre
     lo dibuja en y = 9358–9400, 27 m al norte.

   Que el Sucre reusara las cabezas del Constitución es una **inferencia**: Silva Contreras dice que lo sustituyó
   «al término de la calle Sur 7», y los dos miden lo mismo (60,7 m el símbolo de Mestre, 59,56 m el estudio, 60 m
   la luz del Sucre). Ninguna fuente consultada lo afirma. Por eso el Constitución se dibuja de cabeza a cabeza,
   con 60 m.

Lo que no se pudo resolver: de 1889 a 1936 los tres planos corren el río unos 30 m al sur. No se sabe cuánto es
río que se movió y cuánto error de calce.

## Reserva

- **Casas:** solo el cauce bajo el tablero, 62 × 32 m, de 1889 a 1911. Con el release
  `datos-2026-11-28-c5b8180` no le cambia la vida a ninguna casa.
- **Árboles:** la huella con el margen de una copa (9,5 m por lado) y los accesos hasta 12 m más allá de cada
  cabeza. Al norte la calle del sitio es el pasillo entre las manzanas, que queda al oeste del eje: la franja va de
  0,5 a 6,5 m al oeste y no entra en el lote del este. Con el release actual se retiran cinco árboles, todos del
  monte anterior a la ciudad. Tres de ellos vivían también en 1936 y 1946 y ya no vuelven: un árbol tiene una sola
  vida (pasa igual con el Puente de Hierro). Dos estaban dentro del cauce o bajo el tablero; el tercero, en el
  margen.
- **Colisión:** ninguna. El puente se cruza.
- **1936 y 1946:** ninguna reserva. Un árbol o una casa que nace en esas épocas no se toca.

## Manzanas

Distancia firmada al borde de la manzana más cercana (`public/plano/suelo-manzanas*.png`; negativa = afuera),
medida cada medio metro. El raster es de 2 m por píxel.

| Época | Tablero (8 m) | Estribos (9 m) | Cauce (32 m) | Margen sin árboles (51 m) | Acceso norte | Acceso sur |
|---|---|---|---|---|---|---|
| 1889 | Fuera: 3,6 m | 2,6 m | 1,6 m | 0,9 m | 1,6 m | Sin manzanas (fuera de la imagen de 1889) |
| 1911 | Fuera: 5,0 m | 4,0 m | 3,2 m | 2,2 m | 1,4 m | A más de 16 m |

La manzana más cercana es siempre la del noreste (su esquina está en (9716, 9367)). El E2E
`tests/e2e/puente-sucre.spec.js` repite la medida sobre los datos servidos.

En 1936 y 1946 no hay nada del puente que medir. Si algún día se instala el de concreto: en 1936 la manzana del
oeste baja hasta y ≈ 9370 y hay construcciones nuevas al sur, a 0,2–0,8 m del acceso sur.

## Qué es interpretativo

- **El lugar del Constitución** (ver arriba): 19 m al sur de donde lo dibuja Mestre.
- **Constitución:** va entre las mismas cabezas que el Sucre, 60 m. El estudio de Miraflores le da 59,56 m de
  largo, 6,76 m de ancho y dos apoyos intermedios, y no se localizó la fuente de esas medidas: Silva Contreras solo
  documenta «tramos cortos de vigas rectas» y barandas y pavimento de madera. Columnas, faroles y colores también
  son del estudio.
- **Sucre:** ancho (8 m), altura de la armadura (8 m), ocho paneles, altura sobre el lecho (5 m) y colores,
  nominales del estudio. Documentado: 60 m de luz, sin apoyos, armadura superior tipo *bowstring*.
- **El lecho:** igual que en el Puente de Hierro. Cuenco de 5 m, 32 m de ancho; la franja de agua va donde el plano
  de 1936 dibuja el río.

## Pendiente

- **Puente Sucre de concreto** (1936 y 1946). Fuentes: decreto de 1925 e informe y planos de H. Ayala (MOP,
  *Memoria* 1926, pp. 339–353, no consultada); una postal de costado sin medidas ni licencia. El estudio de
  Miraflores no trae alzado (`modelo: null`). No se instala.
- Las cabezas del Constitución, si aparece otra fuente que las fije.

## Fuentes

- Mónica Silva Contreras, «Puentes metálicos sobre el río Guaire: el carácter de la tradición académica y la imagen
  del diseño estructural», *Tecnología y Construcción* 20-II (2004), pp. 29–42:
  [revista, Universidad Central de Venezuela](https://saber.ucv.ve/ojs/index.php/rev_tc/article/view/2916).
  Constitución y Sucre: p. 34, figs. 10–13 (pp. 34–36) y nota 11 (p. 42). Leído el PDF completo para este PR.
- [Plano de Mestre, 1889](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas,_levantado_en_1889_vajo_la_direccion_-_del_general_don_Vicente_S._Mestre_-_btv1b53027837n.jpg)
  (BnF vía Wikimedia Commons, dominio público), [plano de Razetti, 1911](https://maps.princeton.edu/catalog/princeton-05741v14j)
  (Princeton University Library, sin derechos conocidos) y [plano DCN, 1936](https://archive.org/details/WCWdb_18053)
  (Internet Archive, licencia sin establecer en su ficha).
- [FAC, «¿Sabía usted…?» n.º 107](https://fundaayc.com/2023/10/15/sabia-usted-107/) y
  [FAC, Puente Ayacucho](https://fundaayc.com/2022/09/08/1924-inauguracion-del-puente-ayacucho/): fotografías de
  consulta y la fecha de 1930.
- Estudio de Miraflores: `grunch/miraflores`, `docs/puentes-guaire/sucre.md` y `src/puentes-guaire.js`.

No se agrega al repo ninguna imagen de terceros.

## Capturas

En [`capturas/puente-sucre/`](capturas/puente-sucre/): antes (`main`) y después, misma cámara, desde arriba y de
costado, en 1889, 1911, 1936 y 1946.

```sh
PUENTE_CRUCE=369,1299 PUENTE_VISTA=arriba,costado node tests/e2e/capturas-puente-hierro.mjs http://localhost:5199/ docs/capturas/puente-sucre despues
```
