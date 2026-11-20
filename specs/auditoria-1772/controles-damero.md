# Controles de calce por identidad de damero y correspondencias por unidad

Fecha: 20-11-2026. Cierra los dos criterios de 1D que el [cierre de la fase 1](cierre-fase1.md) tenía pendientes. Generado por `tools/geo/controles_damero.py` (lógica pura en `tools/geo/damero.py`): [controles-calce-sectores.json](controles-calce-sectores.json), [correspondencias-unidades.json](correspondencias-unidades.json) y [verificacion-damero.json](verificacion-damero.json). **Mide y clasifica; no corrige el calce ni el generador, y no aprueba geometría para construir.**

## Método

El TPS de `tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json` enlaza los dos planos por correlación de calles. Un damero es periódico: la correlación puede engancharse a la calle vecina con residuo interno pequeño. Por eso el control no usa cercanía sino **identidad**: cuántas calles separan cada cruce de la esquina de Las Monjas (suroeste de la Plaza Mayor) en cada plano, como hizo #77 a mano en el núcleo.

- 1772: los 70 ejes rectos de [trazado-calles-original.json](trazado-calles-original.json) forman una retícula exacta de 66,3 px (una cuadra con su calle) alineada con los ejes del escaneo; 201 de sus 230 intersecciones caen sobre ella y reciben índice (kx al norte, ky al este). Las 29 restantes son calles quebradas o fuera de paso y quedan fuera.
- 1936: las 329 esquinas de `tools/geo/esquinas/1936-esquinas.json` forman un damero girado 9.45° con paso irregular (105–115 m). Se indexan recorriendo la retícula desde Las Monjas; una esquina con dos propuestas de índice o un índice con dos esquinas se excluye: 244 de 329 quedan indexadas.
- Control: para cada cruce de 1772 con esquina homónima en 1936, el desvío es la distancia entre esa esquina y la proyección TPS del cruce. **167 controles en 14 sectores.** S1772-14 (La Pastora) y S1772-41 (rural) no tienen cruces rectos; S14 recibe un control por hito.

Validación del método: 22 de los 23 nodos curados de #77 se reproducen con la misma esquina de 1936 (distancia entre la esquina por identidad y la curada: 2.58–9.85 m, la media calle entre eje y esquina); los desvíos coinciden con los de #77 dentro de esa tolerancia.

## Resultado: el TPS se desplaza por cuadras enteras fuera del núcleo

| Sector | Cruces-control | Mediana desvío TPS (m) | Máx (m) | Nodos curados (#77) |
|---|---|---|---|---|
| S1772-11 | 2 | 366.94 | 380.532 | 0 |
| S1772-12 | 2 | 309.46 | 324.09 | 0 |
| S1772-13 | 8 | 164.25 | 204.435 | 0 |
| S1772-14 | 0 | — | — | 0 |
| S1772-21 | 9 | 285.19 | 329.463 | 0 |
| S1772-22 | 25 | 96.17 | 290.739 | 5 |
| S1772-23 | 33 | 40.42 | 156.326 | 6 |
| S1772-24 | 5 | 137.61 | 166.669 | 0 |
| S1772-31 | 7 | 259.9 | 273.157 | 0 |
| S1772-32 | 24 | 95.33 | 222.44 | 7 |
| S1772-33 | 23 | 78.92 | 193.827 | 5 |
| S1772-34 | 11 | 178.88 | 223.247 | 0 |
| S1772-41 | 0 | — | — | 0 |
| S1772-42 | 6 | 250.27 | 308.576 | 0 |
| S1772-43 | 11 | 236.43 | 300.001 | 0 |
| S1772-44 | 1 | 256.38 | 256.376 | 0 |

El desvío crece con la distancia a la plaza en saltos de ~110 m, el paso del damero: a cuatro calles al oeste ya es una cuadra; en el suroeste, dos y media. No es imprecisión métrica (el residuo interno del TPS es 12,9 m): es que la correlación identifica calles equivocadas. Prueba por hitos reconocibles en ambos planos, independiente del conteo de calles:

| Hito | Sector | Desvío TPS (m) | Desvío calce de control (m) |
|---|---|---|---|
| Plaza Bolívar | S1772-23 | 6.31 | 6.18 |
| Plaza de Candelaria | S1772-43 | 302.89 | 34.22 |
| Iglesia La Pastora | S1772-14 | 85.59 | 137.01 |

La Plaza de Candelaria de 1772 (U1772-0214) cae bajo el TPS a 302.89 m de la Plaza de Candelaria de 1936: casi tres cuadras. Con el calce de control (un TPS ajustado solo con los 167 cruces por identidad, residuo LOO rms 19.68 m, p90 28.69 m, máx 87.53 m) queda a 34.22 m. La Pastora, en el norte con pocos cruces indexados, queda a 85.59 m bajo el TPS y a 137.01 m bajo el calce de control: allí ninguno de los dos está validado.

**Consecuencia para I1772-010:** la discrepancia no es un detalle de 25 m del núcleo; la máscara `edificado-1772.png` y las cámaras de la auditoría usan un calce desplazado por cuadras en toda la periferia. Es la causa más probable de buena parte de las 124 unidades edificadas sin candidato (I007/I009) y la primera tarea de T33j.2a: rehacer el calce con anclas por identidad (estos cruces más hitos), no con más correlación. Este documento no cambia el GCP: eso es la fase 2.

## Correspondencias por unidad (1B/1D)

Cada unidad censada (caja en el original) se proyecta con el calce de control y se cruza con las cuadras del sistema en 1772 (unión de las huellas vivas en época 1 de `ciudad-estilos.json`, hash `501f0c2b501fccf6…`, el mismo paquete que B1772-001). Una cuadra «cae dentro» si ≥ 50 % de su área está en la unidad.

| Sector | ausente | desplazada_o_parcial | uno_a_uno | vacio_coincide |
|---|---|---|---|---|
| S1772-11 | 7 | 0 | 0 | 7 |
| S1772-12 | 8 | 0 | 0 | 1 |
| S1772-13 | 6 | 0 | 0 | 6 |
| S1772-14 | 6 | 0 | 0 | 0 |
| S1772-21 | 12 | 0 | 0 | 7 |
| S1772-22 | 22 | 0 | 12 | 1 |
| S1772-23 | 23 | 3 | 8 | 1 |
| S1772-24 | 4 | 0 | 0 | 13 |
| S1772-31 | 11 | 0 | 0 | 7 |
| S1772-32 | 16 | 0 | 14 | 2 |
| S1772-33 | 26 | 3 | 8 | 5 |
| S1772-34 | 6 | 0 | 0 | 16 |
| S1772-41 | 0 | 0 | 0 | 0 |
| S1772-42 | 9 | 0 | 0 | 2 |
| S1772-43 | 12 | 0 | 0 | 6 |
| S1772-44 | 0 | 0 | 0 | 2 |

- **42 uno a uno**, todas en el núcleo (S22/23/32/33): la unidad del original y una cuadra del sistema coinciden.
- **168 ausentes**: unidades edificadas en el original sin ninguna cuadra del sistema en 1772. El sistema levanta 45 cuadras en 1772; el original tiene 216 unidades edificadas.
- **6 desplazadas o parciales**: hay cuadra, pero su unión construida rebasa la caja (la clase es conservadora; ver U1772-0055 abajo).
- **76 vacíos que coinciden** y **0 adicionales**: el sistema no construye donde el original tiene terreno libre o plaza, y ninguna de sus 45 cuadras queda sin unidad.
- 72 unidades están fuera del casco de los controles (periferia y norte): su proyección es extrapolada y su clase, más incierta. Ninguna se aprueba para generar: la clase localiza el problema, no la corrección.

## Verificación visual

Lectura de los recortes lado a lado generados por tools/geo/controles_damero.py (original ampliado ×3 con el cruce o la unidad en rojo; mosaico de 1936 con la esquina por identidad en verde, el TPS en rojo, la unidad por calce de control en azul y las cuadras del sistema en naranja). Juicios: coincide = identidad o clase confirmada por el entorno; compatible = sin contradicción pero no demostrada por el recorte; contradice = el recorte desmiente la identidad o la clase.

| Recorte | Objeto | Juicio |
|---|---|---|
| S1772-23-X1772-0021.png | X1772-0021 | compatible |
| S1772-43-X1772-0163.png | X1772-0163 | compatible |
| S1772-11-X1772-0002.png | X1772-0002 | compatible |
| uno_a_uno-U1772-0064.png | U1772-0064 | coincide |
| ausente-U1772-0184.png | U1772-0184 | coincide |
| desplazada_o_parcial-U1772-0055.png | U1772-0055 | coincide_con_clase_conservadora |

Seis recortes de 49 generados: una muestra, no una verificación completa; los 167 cruces y las 292 clases siguen siendo medidas automáticas con identidad por conteo de calles. Los 49 recortes (25 de controles, 24 de correspondencias) viven fuera de git con su SHA-256 en los JSON.

## Límites

- La identidad por conteo supone que ninguna calle del damero se abrió o cerró entre 1772 y 1936 dentro del área indexada. Los hitos lo confirman hacia el este (Candelaria) y es compatible hacia el norte (La Pastora); el BFS excluye las zonas donde la retícula de 1936 se vuelve irregular, que es donde esa hipótesis fallaría.
- Las esquinas de 1936 son puntos de esquina, no ejes: la media calle (≈ 6 m) queda dentro de los desvíos.
- El original es esquemático (≈ 1,7 m/px): sus cruces tienen ± 3 px (≈ 5 m) de lectura.
- Nada de esto certifica la ocupación ni la forma de las casas: solo dónde el sistema debería mirar.
