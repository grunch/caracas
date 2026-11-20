# Bordes especiales: dos contornos y seis símbolos

Se inspeccionaron por separado los siete recortes enumerados en
`bordes-especiales-original.json`, y se volvieron a observar U0013 y U0069 con
los contornos propuestos superpuestos al original. La lectura resuelve la
interpretación de doce bordes previamente pendientes; no aprueba geometría
para generar edificios ni certifica accesos.

## Contornos observados

- **U0013:** pentágono irregular. El extremo oriental de la cara candidata
  prolongaba la unidad hasta el cruce de calles vecino. El contorno observado
  termina antes, con un testero corto inclinado. Se descartan sus cinco bordes
  candidatos como representación del contorno edificado: no se reasignan sus
  IDs a lados distintos. Se conserva la cara anterior como evidencia del error.
- **U0069:** el contorno tiene seis lados. Su borde inferior consta de dos
  horizontales unidos por una diagonal. La calle mantiene este recodo y separa
  U0069 de U0232. Un borde recto entre extremos no representa esa separación.

Las coordenadas nuevas siguen el contorno cartográfico exterior del rojo, con
lectura manual al píxel del escaneo. El grosor variable del trazo negro impide
atribuirles precisión métrica. **No son ejes de calle, líneas de lote, polígonos
de techo ni superficies que deban rellenarse.** Su transformación al sistema
queda pendiente de reconciliar el calce. No se alteró el trazado candidato global.

## Símbolos y vacíos

En U0051, U0067, U0077, U0081 y U0094 hay seis bordes afectados por recuadros
blancos con símbolos religiosos. En estos puntos el contorno exterior dibujado
permanece cerrado: el blanco del símbolo no demuestra un paso a patios ni un
vacío de construcción. Tampoco demuestra una fachada doméstica continua.
La nueva lectura es `simbolo_religioso_en_contorno_cerrado`.

Los entrantes blancos exteriores de U0051, U0067 y U0077 se conservan. Son
observaciones distintas de los recuadros religiosos y no deben desaparecer al
tratar el símbolo. El plano no determina puertas, tapias o derechos de paso;
estas decisiones continúan pendientes en la reconstrucción de conjuntos y accesos.

## Reproducción y controles

El JSON conserva la fuente y su SHA-256, cajas de los siete recortes, hashes de
sus ampliaciones ×4, coordenadas de los dos contornos y hashes de las
superposiciones ×6. No se incorporan imágenes a git. Los recortes se regeneran
con Pillow (RGB, `Image.open(fuente).crop(caja).resize((ancho*4, alto*4))`).
Las superposiciones usan los puntos trasladados por el origen del recorte y
multiplicados por seis; línea cian de dos píxeles, cerrada sobre el primer punto.
Los vértices se marcan con círculos cian de radio cuatro; etiquetas azules a
cinco píxeles del centro con la fuente predeterminada de Pillow.

Comprobaciones realizadas: siete IDs únicos del censo, doce IDs de frente
existentes y asociados a su unidad, dos polígonos simples de cinco y seis lados,
contenidos en sus recortes; SHA-256 del original coincidente. Los 590 IDs de
frente originales permanecen sin altas, bajas ni reasignaciones.

La lectura general conserva 574 clasificaciones por rojo y cuatro de plaza.
Las otras doce ahora distinguen cinco bordes candidatos descartados, un recodo
no representado por la recta candidata y seis símbolos con contorno cerrado.
Esta revisión elimina esos pendientes de interpretación del original; **no
cierra la fase 1**, la correspondencia con el sistema ni los problemas de acceso.
