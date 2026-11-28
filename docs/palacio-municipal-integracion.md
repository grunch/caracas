# Palacio Municipal y Santa Rosa: etapas, huella e instalación (#252)

El conjunto del [issue #252](https://github.com/grunch/caracas/issues/252): el solar del Seminario de Santa Rosa
de Lima en la esquina de Las Monjas, lado sur de la Plaza Bolívar, que fue universidad, tribunales, gobernación y
Concejo, y hoy es el Palacio Municipal. Tarea T82.PM del plan.

## Qué había y qué se hizo

En `main` (`b482621`) eran **tres marcas sueltas** sin edificio: `seminario` («Seminario y Universidad», 1772–1843,
con el punto en (8950, 6975), al medio del frente de la cuadra; D4 de `specs/13` la da por caída en la calle),
`concejo` (1889–1911) y `justicia` (desde 1936), a 5 m una de otra. Debajo, casas genéricas en todas las épocas.

No hay estudio en `grunch/miraflores` (ni `src/`, ni `docs/prioridades/`, ni `entregables/`). Lo que se hizo acá:

- una **sola marca**, `palacio-municipal`, sobre el solar, con el nombre que cada plano le da a ese solar;
- la **planta**: el recuadro rayado «Palacio de Justicia» del plano de 1936, con su patio
  ([lectura](palacio-municipal-georreferencia.json));
- el **volumen**, solo donde una fuente lo describe: el edificio reformado por Chataing en 1904–1906, que el
  catálogo del IPC describe. Va desde 1911;
- antes de 1911 **no se dibuja**: no se halló alzado ni planta del seminario, ni del edificio de 1872. La ficha lo
  dice a la vista en cada una de esas épocas.

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = fuente secundaria sin cita, o dos que coinciden;
**baja** = interpretación.

| Etapa | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1578 | El primer plano de la ciudad rotula «casa» el solar al suroeste de la Plaza Mayor | Luisvel Ortiz, [«De Seminario colonial a Museo: el Palacio Municipal de Caracas»](https://cronistacss-cal.mincyt.gob.ve/wp-content/uploads/2025/10/Concejo-Municipal-PATRIOMONIO-1.pdf) (cronista de Caracas, 2025), sobre la copia del plano de Pimentel | media | — |
| 1673 | El obispo Antonio González de Acuña compra casas en la esquina suroeste de la plaza para un colegio seminario | Catálogo del Patrimonio Cultural Venezolano 2004–2007 del IPC, **citado por** [IAM Venezuela](https://iamvenezuela.org/2016/07/palacio-municipal-sede-de-la-alcaldia-del-municipio-libertador/) (2016); Ortiz | media: el IPC, de segunda mano | — |
| 1696 | El seminario se termina (IPC); el 29-8-1696 es ya el Colegio de Santa Rosa de Lima, con capilla (Ortiz) | IPC citado por IAM; Ortiz | media | — |
| 1721–1725 | Real cédula del 22-12-1721: seminario y universidad (Ortiz). Wikipedia en español da la inauguración el 11-8-1725, sin referencia | Ortiz; [Wikipedia](https://es.wikipedia.org/wiki/Palacio_Municipal_de_Caracas) (sin citas) | media para 1721, baja para 1725 | — |
| 1772 | La cuadra entera en rojo, sin separar edificios ni rotular | Plano de 1772 (`fuentes/mapas/1772-pares-agi-exato-mapa`, calce 18,7 m RMS) | alta para que la cuadra estaba edificada; nada sobre el edificio | **sin geometría**; marca «Seminario de Santa Rosa y Universidad» |
| 1811 | El Congreso declara la independencia en la capilla del seminario, el 5 de julio | IPC citado por IAM; Ortiz | media | — |
| 1812–1829 | El terremoto de 1812 y la guerra golpean el edificio; en 1829 el arzobispo Méndez pide repararlo | Ortiz, **que cita a** Hermann González, «El Seminario de Santa Rosa de Lima, entre los años de 1856 a 1915», *Boletín de la ANH* n.º 278 (1987), p. 390. No pude abrir el artículo (el servidor de la UNAM rechazó la conexión) | media: de segunda mano | — |
| 1843 | Tres solares públicos en blanco sobre el frente de la plaza: L «Cap. de la Universidad» (esquina de Las Monjas), k «Universidad» (al medio) y j «Palacio Arzobispal» (esquina de Las Gradillas) | Plano de Jesurún de 1843 (`specs/auditoria-1843/leyenda.json`; calce 12,4 m RMS); las letras, leídas sobre el plano calzado | alta para nombres y orden de los solares; baja para sus linderos | **sin geometría**: no se sabe cómo estaba el edificio tras 1812; marca «Universidad y su capilla» |
| 1856 / 1857 | La universidad se muda al convento de San Francisco | Wikipedia (1856, sin cita); Ortiz (juntos «hasta 1857») | media; el año, en disputa | — (el hito `universidad`, en San Francisco, lleva ese nombre desde 1889) |
| 1872 / 1873 | Guzmán Blanco cierra el seminario; Juan Hurtado Manrique rehace el edificio para los tribunales, la gobernación y la policía, y la capilla pasa a salón de sesiones del Concejo | IPC citado por IAM (1872, «Palacio de Justicia»); [Guía de Arquitectura y Paisaje de Caracas](https://guiaccs.com/en/obras/municipal-palace-of-caracas/) (González Viso, Vegas y Peña; 1872, Hurtado Manrique); Ortiz (clausura en **1873**) | media; el año, en disputa | — |
| 1881 | Se inaugura el pabellón occidental | IPC citado por IAM; Ortiz | media | — |
| 1889 | 7 «Consejo municipal» (esquina de Las Monjas, hasta unos 55 m de la plaza), 8 «Gobernación» (al medio), 9 «Palacio arzobispal» | Plano de Mestre de 1889 (leyenda «Explicaciones», leída en el original; calce 7,6 m RMS) | alta | **sin geometría**: del edificio de 1872–1881 no se halló descripción ni vista fechada; marca «Concejo Municipal y Gobernación» |
| 1904–1906 | Cipriano Castro encarga a Alejandro Chataing la reforma, terminada en 1906 | IPC citado por IAM; Guía; Ortiz. Wikipedia da la inauguración el 23-5-1906, sin cita | media | — |
| 1911 | 11 «Palacio de Justicia (Gobernación, Tribunales, Prefectura, Rentas, Ingeniería Municipal) — Oeste 2, Gradillas a Monjas»; 12 «Concejo Municipal — S. 2, Monjas a San Francisco»; 13 «Cuartel de Policía — S. 2, Monjas a San Francisco»; 18 «Palacio Arzobispal — E. 2, esquina Gradillas» | Plano de Razetti de 1911 (leyenda «Edificios públicos», leída en el original; calce 6,7 m RMS) | alta | **edificio**: dos pisos alrededor del patio, frente de tres cuerpos a la plaza; marca «Concejo Municipal y Palacio de Justicia» |
| 1936 | Recuadro rayado «Palacio de Justicia» de 45 × 75 m con un patio de 22 × 19 m | Plano DCN de 1936 | alta | igual; marca «Palacio de Justicia» |
| 1946 | El mismo contorno y el mismo patio, sin rótulo | Plano DCN de fotos de 1946 (calce 2,1 m RMS) | alta para la planta; el nombre no figura | igual |
| hoy | Volumen de esquina de planta rectangular, eje simétrico, patio central con fuente, corredores con columnas en planta baja y alta; frente de tres cuerpos, el central con portón y frontón triangular, los laterales con frontones curvos; conserva la capilla del seminario. Monumento Histórico Nacional | IPC citado por IAM; Guía (ventanas bajas de arco, altas con balcón, cornisa) | alta para el edificio actual | de aquí sale el volumen desde 1911 |

### Contradicciones y dudas que siguen abiertas

- **Cierre del seminario**: 1872 (IPC citado por IAM, Guía, el issue) o 1873 (Ortiz). No se resuelve; no cambia
  ninguna época del mapa (cae entre 1843 y 1889).
- **Mudanza de la universidad**: 1856 (Wikipedia, y el título del artículo de González) o 1857 (Ortiz).
- **Monumento Histórico Nacional**: 16-2-1979, Gaceta Oficial n.º 31.678 (IAM) o 1973 (Ortiz). Wikipedia pone en
  1973 la restauración de la capilla.
- **IAM da además «fechas de construcción 1899 y 1908»**, que no cuadran con su propio 1904–1906.
- **Justicia y Concejo a la vez**: no es contradicción. El edificio se llamó Palacio de Justicia desde 1872 y el
  Concejo sesionaba en la capilla; el plano de 1889 nombra el Concejo y la Gobernación, el de 1911 los dos, y el de
  1936 solo «Palacio de Justicia». La marca lleva en cada época lo que dice su plano.
- **Hasta cuándo estuvieron los tribunales**: no se halló. El plano de 1946 no rotula; la marca conserva el nombre
  de 1936.
- **El frente de 1906**: lo descrito es el edificio actual. Que no cambió desde 1906 no está probado con una vista
  de época; no se halló ninguna con licencia identificada (la categoría de Commons trae 27 archivos, todos
  posteriores a 2003).
- **La capilla**: las fuentes dicen que la reforma la «integra» al edificio y la leyenda de 1843 la pone en el
  solar de la esquina; no se halló su planta. No va como volumen aparte.
- **1772**: el nombre de la marca no sale de un plano (la leyenda de 1772 no está transcrita).

## Huella y reserva

Recuadro leído en el plano de 1936 (0,5 m por píxel): esquinas (8853, 6929), (8940, 6951), (8916, 7097) y
(8825, 7079); lados de 44,9 (plaza), 74,0, 46,4 y 76,3 m (calle Sur 2). Es un cuadrilátero algo torcido; el modelo
usa el **rectángulo medio de 45,5 × 75 m**, con centro en (8883,5, 7014) y eje (0,9755, 0,22). Cada esquina queda a
menos de 2,5 m de la leída (el test lo exige a menos de 3 m). El patio, de 21,9 × 19,4 m, queda en la mitad norte.
El plano de 1946 repite contorno y patio con 2 a 3 m de diferencia, dentro de su calce.

La reserva (`suprime`, `sinArboles`) es ese mismo rectángulo, **desde 1911**: no toca la calle de la plaza, la
calle Sur 2 ni a los vecinos. Antes de 1911 el hito no reserva nada y la cuadra sigue como en `main`.

### R13: ningún edificio sobre una manzana

El solar mide 3.412 m² y la cuadra (Monjas, Gradillas, Sociedad, San Francisco), unos 11.760 m² en el plano de
1936: ocupa el 29 %, menos de la mitad que R13 pide para «grande». Es un **hito chico**, que va dentro de su
manzana y no la retira.

Medido con `tools/hitos-manzanas-tabla.mjs` sobre los informes de retiro de los datos completos (28-11-2026), en
1911, 1936 y 1946: manzana `U1772-0080` (11.837 m²), 99,6 % del recuadro dentro de ella, 28,7 % de la manzana
bajo el hito, clase **chico**, decisión **conservar**. Las filas de los demás hitos no cambian.
`docs/manzanas-hitos.json` no se toca: lo reescribe la herramienta al regenerar los datos.

## Lo que se dibuja y lo que no

| Parte | Fuente | Qué es interpretación |
|---|---|---|
| Cuatro cuerpos alrededor del patio | plano de 1936 (planta y patio); IPC (patio central) | — |
| Dos pisos | IPC («planta baja y planta alta») | el alto de cada piso (5 m): proporción, sin fuente |
| Corredores con pilares en los dos pisos y fuente | IPC; foto de 2012 del patio (Commons, EL Guarito, CC BY-SA 3.0), solo consultada | número de pilares, tamaño de la fuente |
| Frente de tres cuerpos a la plaza, frontón triangular al centro y curvos a los lados | IPC; Guía | anchos de los cuerpos (9 y 8 m), columnas, alto de los frontones |
| Vanos de arco abajo y con balcón arriba | Guía | cuántos y dónde |
| Azotea con cornisa y pretil | Guía («ornamental cornice»); foto de 2012 del frente (Commons, Omerta-ve, CC BY-SA 3.0), solo consultada | todo el detalle |
| Cuerpo de atrás (42 m al sur del patio) | plano de 1936 (dentro del rayado); plano de 1911 (13, Cuartel de Policía) | **envolvente** a la altura del frente, sin fuente; sus patios chicos no se modelan |
| Lados este y sur ciegos | medianeras en el plano | — |

No se dibuja: la capilla como volumen propio, el seminario colonial, el edificio de 1872–1881, los patios chicos
del cuerpo de atrás, el escalón del noreste que añade el plano de 1946.

Las dos fotos de Commons son **actuales**: sirven para saber hacia dónde mira el frente y cómo es la cubierta, no
prueban una fachada antigua. No se incorporan al repo.

## Vecinos

- **`universidad`** (convento de San Francisco, frente al Capitolio, a unos 150 m): no se solapan ni se
  contradicen. La universidad estuvo en el seminario hasta 1856 o 1857; el hito de San Francisco lleva el nombre
  «Universidad» desde 1889 y esta marca lo lleva en 1772 y 1843.
- **`palacio-arzobispal`**: las leyendas de 1843 (j), 1889 (9) y 1911 (18, «esquina Gradillas») y la página de IAM
  («junto al Palacio Arzobispal») lo ponen **en esta misma cuadra**, en el solar de la esquina de Las Gradillas, al
  este del conjunto. El hito del repo está en la cuadra de la Catedral, al otro lado de la calle (9096, 6917). No se
  toca en este PR; queda anotado como hallazgo.

## Qué queda de #252

- El edificio en 1772, 1843 y 1889: falta una fuente con su forma (planta de época, grabado o foto fechada).
- La capilla de Santa Rosa como volumen: falta su planta.
- Una vista fechada del frente de 1906 y cualquier altura medida.
- Referencias visuales de época con licencia: ninguna hallada.
- Regenerar y publicar los datos: los pasos de manzanas y de retiro leen `hitosConPlanta()`.
- La prueba a mano de una persona.
