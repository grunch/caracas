# Cuartel San Carlos: fases, huella e instalación (#248)

Tarea T82.SC del plan, para el [issue #248](https://github.com/grunch/caracas/issues/248). En `main` (`b482621`)
el cuartel era una marca sin hito: un nombre sobre una manzana de casas genéricas (D4 de `specs/13`).

## Qué se hizo y con qué

**No hay estudio en Miraflores** (ni `src/patrimonio-*.js`, ni `docs/prioridades/`, ni `entregables/`). El modelo
se armó acá, con el mismo criterio que los templos del #259:

- la **planta** es el contorno del plano DCN de 1936, contrastado con el de 1946 ([lectura](san-carlos-georreferencia.json));
- las **fases** salen de las fuentes escritas (abajo);
- el **volumen** es una envolvente: un piso de muro encalado con teja sobre cada cuerpo que el plano rellena.
  Lo que ninguna fuente con licencia dibuja **no se modela**: arcos del patio, garitas, enfermería, Comandancia,
  ventanas.

## Fuentes

| Fuente | Qué aporta | Límite |
|---|---|---|
| Mariana Flores, «Cuartel San Carlos. Yacimiento veterano», *Memorias* 4(7), Uninorte, mayo de 2007: <https://dialnet.unirioja.es/descarga/articulo/2321930.pdf> (leído completo, 26 páginas) | Obras de 1785 a 1790; ruinas de 1812; reparación desde 1839 y restauración de 1884; terremoto de 1900 y lo que se agregó; Comandancia de 1946; nombres; áreas (Traspatio, Patio Central, Naves Este y Oeste) | Las fechas posteriores a 1790 son **de segunda mano**: Flores cita a Liendo (2001: 103) y a Avendaño (1999: 3), que no pude leer. No da medidas ni alturas. Sus figuras (entre ellas el plano de González Dávila de 1785, «tomado de Liendo, 2001: 106») no se calcan ni se redistribuyen: derechos sin verificar |
| Fermín de la Rueda, ficha 53 «Cuartel San Carlos», *CCS Guía de arquitectura*: <https://guiaccs.com/obras/cuartel-san-carlos-2/> (página actual, sin fecha; el texto servido está en inglés) | «originally a 75 by 75 meter square»; plaza de armas rodeada de corredores con arcos; «two stories»; garitas en las esquinas; orden de construcción de 1787, primera etapa en 1790, fin en 1792; ingeniero Agustín Cramer | Fuente secundaria, sin bibliografía. Describe el edificio actual sin fechar sus partes |
| Wikipedia, «Cuartel San Carlos»: <https://es.wikipedia.org/wiki/Cuartel_San_Carlos> | Desocupado desde 1812 hasta que Soublette decide restaurarlo en 1839; «muros de unos 100 m de lado» | Terciaria; cita prensa de 2019. Solo como contraste |
| Planos del catálogo (`fuentes/mapas/`): 1772, Jesurún 1843, Mestre 1889, Razetti 1911, DCN 1936 y 1946 | Presencia, nombre y contorno por época | Ver la tabla de etapas |
| Foto «Cuartel San Carlos 02.jpg», Antonio Gagliardi (ToXmAn), noviembre de 2008, CC BY-SA 4.0: <https://commons.wikimedia.org/wiki/File:Cuartel_San_Carlos_02.jpg> | Costado de la entrada: un piso alto de muro con una hilera de ventanas con reja, alero de teja, portada con remate curvo | **Foto actual**: no prueba el aspecto antiguo. Solo consultada; no se incorpora al paquete de fotos |
| Foto «San Carlos military stockade - Venezuela.jpg», Márcio Cabral de Moura, 3-2-2008, CC BY 2.0: <https://commons.wikimedia.org/wiki/File:San_Carlos_military_stockade_-_Venezuela.jpg> | Un frente largo de un piso con cubierta de teja a varias aguas | Ídem |

No pude abrir aporrea.org (HTTP 403). El tomo del catálogo del IPC «Lo construido» del municipio Libertador
(<https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf>) no trae el cuartel. No hallé
ninguna imagen anterior a 1946 con licencia identificada.

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = una fuente secundaria lo afirma citando a otra;
**baja** = inferencia nuestra.

| Etapa (fecha del hecho) | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1772 | Campo al norte de la ciudad | Plano de 1772 | alta | no existe |
| 1785–1790 (o 1787–1792) | Construcción para la tropa veterana, en las Sabanas de la Trinidad | Flores (2007); guía CCS | alta para la década; el año, en disputa | — (no hay época entre 1772 y 1843) |
| 1812 | El terremoto lo deja en ruinas | Flores (2007) | alta | — |
| 1839–1884 | Reparaciones desde 1839 (Soublette); restauración completa en 1884 (Guzmán Blanco) | Liendo (2001), citado por Flores (2007) | media | — |
| 1843 | Letra s «Cuartel veterº», cuadro rayado aislado de unos 87 m de lado, unos 45 m al este del contorno de 1936 | Plano de Jesurún de 1843 (`specs/auditoria-1843/leyenda.json`); calce 12,4 m RMS | alta para la presencia y el nombre; el estado del edificio no se conoce | **sin hito**: en reparación, no se sabe qué quedaba en pie. Queda la marca «Cuartel Veterano» y la ficha lo dice |
| 1889 | «Cuartel Sⁿ Carlos», n.º 21: rectángulo de unos 91 × 70 m con un patio centrado | Plano de Mestre de 1889; calce 7,6 m RMS | alta para la presencia; baja para la forma | el **cuadro** de 72,4 × 77 m alrededor del patio central |
| 1900 y después | El terremoto destruye parte; al reconstruir se prolongan las naves este y oeste y se levantan la enfermería y las cuatro garitas | Avendaño (1999), citado por Flores (2007) | media | — |
| 1911 | Bloque rojo n.º 36, sin patio | Plano de Razetti de 1911 (la leyenda no está transcrita en el repo: se identifica por el lugar) | alta para la presencia | el contorno completo de 72,4 × 98,3 m, con el traspatio |
| 1936 | Edificio de dos patios, sin rótulo propio; «Quinta Guzmán» al oeste y jardines al sur | Plano DCN de 1936 | alta | igual; **de aquí sale la planta** |
| 1946 | Mismo contorno; «Sn. Carlos» rotula la esquina. La Comandancia se inserta en el patio central en 1946; cárcel de presos políticos bajo Betancourt (1945–1948) | Plano DCN de 1946; Avendaño (1999), citado por Flores (2007) | alta el contorno; media la Comandancia | igual que 1936: **la Comandancia no se dibuja** (el plano no la trae) |

## Decisiones interpretativas

1. **1843 sin edificio.** La fuente dice ruinas desde 1812 y obra desde 1839 hasta 1884. No se dibuja terminado
   lo que estaba en obra, y tampoco una ruina cuya forma nadie describe. El hito nace en 1889. En 1843 el mapa
   sigue mostrando la manzana genérica `U1843-0051-A0`, que es el cuadro «s» de Jesurún corrido unos 45 m al este
   por el calce de ese plano: **no es evidencia del edificio**, y la ficha de 1843 lo dice.
2. **El cuadro de 1889 termina en la crujía norte del patio.** Es una inferencia (certeza baja) que junta tres
   datos: la guía CCS da un cuadro original de 75 × 75 m; Avendaño, por Flores, pone la prolongación de las naves
   después de 1900; y en el plano de 1936 el frente mide 72,4 m y la crujía que cierra el patio central termina a
   77 m de la fachada, con el traspatio detrás. Flores cuenta además que el Traspatio conserva empedrado colonial,
   como un espacio exterior. En contra: Mestre lo dibuja de 91 × 70 m en 1889 y Jesurún, de 87 m de lado en 1843;
   son contornos esquemáticos (Mestre le pone un solo patio centrado).
3. **Un piso.** La guía CCS dice «two stories»; las dos fotos de 2008 muestran por fuera un solo piso alto. Sin
   medida publicada, va un muro de 6,5 m estimado sobre las fotos, con cubierta de teja de 3 m como mucho.
   Tolerancia honesta: ±1,5 m.
4. **Reparto interior del plano de 1936 en todas las fases.** Nave oeste doble (el plano separa dos cuerpos con una
   tira en blanco de 2,5 m), patio corrido hacia el este. No hay planta fechada anterior con licencia.
5. **Entrada al sur**, por los jardines del plano de 1936 y la foto de la «entrada». Una sola puerta, sin ventanas.

## Tolerancias

- Contorno: lectura a ojo, ±1 px (0,5 m) por vértice; el plano de 1936 respecto del terreno, sin medir. La esquina
  este, bajo la costura de las hojas, se cierra por paralelismo y difiere 3,5 m de la del plano de 1946.
- Los lados no son exactamente perpendiculares en el plano (1,2°): el modelo es un rectángulo.
- Patio central: el plano de 1946 lo pone unos 4 m al oeste y 4 m más angosto; vale la lectura de 1936.
- Alturas: sin fuente (decisión 3).

## R13: el hito y las manzanas

Medido con `medirHitos` (`tools/hitos-manzanas.mjs`) contra los informes de retiro de los datos completos
(`fuentes/derivados/retiro<año>/`, generados con `27abd10`):

| Época | Manzana | Área (m²) | Recinto en la manzana | Manzana bajo el recinto | Clase | Decisión |
|---|---|---:|---:|---:|---|---|
| 1772, 1843 | — | | | | sin cruces (el hito no existe) | |
| 1889–1946 | `U1843-0051-A0` | 7.015 | 15,0 % | 15,2 % | grande | **retirar** |
| 1889–1946 | `U1843-0053-A0` | 9.074 | 12,5 % | 9,8 % | a caballo | conservar |
| 1911–1946 | `M4-0081-A1` | 4.217 | 56,6 % | 95,5 % | grande | **retirar** |

- `M4-0081-A1` es la manzana del propio cuartel desde 1911: el hito es **grande** y la retira entera, como manda R13.
- `U1843-0051-A0` es el cuadro «s» de Jesurún (el cuartel mismo, 45 m al este): el generador la arrastra por
  continuidad hasta 1946 y la regla la retira desde 1889. **Ojo**: su mitad este cae donde el plano de 1936 dibuja
  otra manzana; al retirarla se pierden esas casas hasta que el generador la parta. Queda pendiente.
- `U1843-0053-A0` (la de la Quinta Guzmán) solo roza: es el margen del calce.

**Este PR no regenera los datos.** Hasta que se regeneren, la reserva actúa al cargar (`suprime`, `sinArboles`,
`solarCompleto`): esconde las casas y árboles que pisan el solar, y el resto de esas manzanas sigue a la vista
(se ve en las capturas: media manzana genérica al este del cuartel).

## Qué queda abierto de #248

- Una vista o planta **anterior a 1946 con licencia** (fachada, cubiertas, garitas): sin ella no hay alzado.
- Leer a Liendo (2001) y a Avendaño (1999), hoy citados de segunda mano.
- 1843: qué quedaba en pie. La manzana genérica de 1843 sigue ahí.
- Garitas, enfermería, arcos del patio y Comandancia de 1946: sin forma ni lugar documentados.
- La contradicción «dos pisos» (guía CCS) frente a un piso (fotos de 2008).
- Regenerar y publicar los datos; partir `U1843-0051-A0`.
- La leyenda de Razetti (n.º 36) sin transcribir.
