# Medición del Palacio Municipal (#252)

28-11-2026. `main` `fab5b25` (con La Candelaria, #314; worktree `/disco/dev/caracas-palacio-municipal-base`) frente a
la rama `feat/palacio-municipal-252`, que tiene ese mismo `main` fusionado. Los dos sirven los mismos datos
completos (`/disco/dev/caracas-datos-sur/public`) con el servidor de desarrollo de Vite (puertos 5253 y 5252), no
con el sitio construido: los tiempos de carga y los bytes incluyen los módulos sin empaquetar ni comprimir.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, en serie,
alternando los lados, dos pasadas por lado. Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800. Carga media de la
máquina durante las pasadas: de 4 a 10 (otros agentes trabajando).

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia |
|---|---:|---:|---:|---:|---|
| casasMs | 5.015 | 4.834 | 4.908 | 4.951 | ruido |
| tareaMasLargaMs | 378 | 354 | 377 | 376 | ruido (24 ms entre las dos de `main`) |
| bytesAlAbrir | 29.109.433 | 29.109.433 | 29.159.737 | 29.159.737 | +50.304 (módulos sin empaquetar ni comprimir) |
| heapMB | 326 | 347 | 347 | 326 | igual (salta entre 326 y 347 en los dos lados) |
| Geometría en JS (MB) | 204,2 | 204,2 | 204,6 | 204,6 | +0,4 |
| Vértices | 5.220.029 | 5.220.029 | 5.225.214 | 5.225.214 | +5.185 |
| triangulosCentro | 8.613.162 | 8.613.162 | 8.616.228 | 8.616.228 | +3.066 |
| Llamadas en la vista centro | 236 | 236 | 238 | 238 | +2 |
| Llamadas en valle / cerca | 609 / 149 | 609 / 149 | 611 / 151 | 611 / 151 | +2 |
| ms por cuadro, centro (mediana / p90) | 11,6 / 12,1 | 11,7 / 22,3 | 11,6 / 20,3 | 11,6 / 17,8 | mediana igual; el p90 salta en los dos lados |
| ms por cuadro, valle | 14,5 / 16,9 | 14,1 / 14,9 | 14,1 / 14,9 | 14,2 / 15,1 | ruido |
| ms por cuadro, cerca | 10,6 / 12,0 | 10,9 / 11,7 | 11,0 / 11,7 | 10,9 / 11,9 | ruido |

Lo que no depende de la carga se repite exacto en las dos pasadas.

- **El hito suma 2.596 triángulos y 4.646 vértices** (contados aparte, con `crearLienzo`): va en la malla única de
  los hitos y en una sola fase.
- **La diferencia quedó atribuida** en una segunda tanda (misma orden, `main` `4c3765b` y la rama con ese `main`
  fusionado; solo lo que no depende de la carga). La malla de los hitos suma exactamente lo del hito: 2.596
  triángulos y 4.646 vértices, contados en la página (`lab.hitos.geometry`). Variando las reservas del hito:

  | Variante | Vértices | Llamadas (centro / valle / cerca) | Triángulos por cuadro, centro |
  |---|---:|---|---:|
  | `main` | 5.223.157 | 236 / 609 / 149 | 8.597.478 |
  | rama, sin reservas (ni `suprime` ni `sinArboles`) | +4.646 | 236 / 609 / 149 | +5.192 |
  | rama, sin `suprime` (con `sinArboles`) | +4.646 | 236 / 609 / 149 | +3.392 |
  | rama, con `suprime` desde 1772 en vez de 1911 | +4.646 | 236 / 609 / 149 | +3.066 |
  | rama, tal cual (`suprime` desde 1911) | +5.185 | 238 / 611 / 151 | +3.066 |

  - Los triángulos por cuadro cuentan el hito **dos veces** (+5.192 = 2 × 2.596; no miré en
    qué pasadas del cuadro, pero la cuenta es exacta en las tres vistas). La reserva de árboles quita 1.800 y la de casas, 326 (los techos que esconde):
    5.192 − 1.800 − 326 = 3.066. Los «470 de más» eran esa cuenta, no geometría sin dueño.
  - **Las 2 llamadas y los 539 vértices de más salen de las tres casas cuya vida cambia** (716, 717 y 718, que pasan
    de vivir siempre a vivir hasta 1889): con la misma reserva puesta desde 1772 (las casas no existen nunca)
    desaparecen las dos llamadas y los 539 vértices, y los triángulos no cambian. La hipótesis se sostuvo. No miré
    en el código por qué una casa con otra vida pide llamadas aparte; al regenerar los datos esas casas dejan de
    existir y las dos llamadas se van con ellas.
  - Los informes de esta tanda no se guardaron en el repo (cinco pasadas de un minuto, fuera de él).
- El tiempo por cuadro no cambia en la mediana. El p90 de la vista del centro salta a ~20 ms en una pasada de
  `main` y en las dos de la rama: es la carga de la máquina, como ya anotó la medición de #243.

Los topes de carga, tarea larga, bytes, memoria y triángulos del presupuesto ya no pasan en `main` con los datos
completos y siguen sin pasar en la rama: **no se tocaron**.

Topes que sí suben, medidos después de fusionar también #316 (Las Mercedes): triángulos de los hitos antes de
1946, de 647.000 a 650.000 (648.121); total, de 1.127.000 a 1.130.000 (1.127.494); workers del build, de 176 a
178 kB (176,6 contra 174,2 de `main`; `node tools/rendimiento/presupuesto-build.mjs`). La tabla de arriba es
anterior a esa fusión.

**No medí**: el sitio construido en un navegador (solo el tamaño del build), un teléfono, ni una máquina en reposo.
Una primera tanda contra `main` `b482621` (sin La Candelaria) se descartó: mezclaba los dos templos.
