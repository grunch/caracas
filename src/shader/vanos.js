/**
 * Las herramientas de dibujo de las fachadas y sus vanos (puertas, ventanas, vidrieras, balcones),
 * con sus rejas y marcos. Todo en metros sobre la pared: x desde el centro del paño, y dentro del
 * piso; w2 = cuántos metros de pared entran en un píxel (a lo largo, a lo alto), de las derivadas que
 * toma el main (src/material.js). Cada parte suma su color (c) y su tinta (k, para el grabado).
 * Lo usa GLSL_FACHADA (src/shader/fachada.js), que pone antes los estilos, Medidas y madera().
 */

/** Detalle, relleno, trazo, barras, rayado y manchas: lo fino se apaga a su tono medio, sin moiré. */
export const GLSL_DIBUJO = /* glsl */ `
  /** Cuánto sobrevive un detalle de t metros cuando un píxel mide w metros (el LOD, por derivadas). */
  float detalle(float t, float w) { return 1.0 - smoothstep(0.2 * t, 0.5 * t, w); }
  /** Relleno suavizado de una distancia con signo (negativa adentro). */
  float lleno(float d, float w) { return 1.0 - smoothstep(-w, w, d); }
  /** a <= t <= b, suavizado. */
  float banda(float t, float a, float b, float w) { return smoothstep(a - w, a + w, t) - smoothstep(b - w, b + w, t); }
  /** Un trazo de pluma de medio grosor g sobre d = 0; más fino que un píxel, se aclara en vez de titilar. */
  float trazo(float d, float g, float w) { float a = max(g, w); return (1.0 - smoothstep(a - w, a + w, abs(d))) * min(1.0, g / w); }
  /** Caja de medio tamaño e centrada en el origen (distancia con signo). */
  float caja(vec2 p, vec2 e) { vec2 q = abs(p) - e; return max(q.x, q.y); }
  /** Barras de grosor g cada per metros (la primera en x = 0); de lejos, su tono medio. */
  float barras(float x, float per, float g, float w) {
    float d = abs(fract(x / per + 0.5) - 0.5) * per;
    float nitida = 1.0 - smoothstep(0.5 * g - w, 0.5 * g + w, d);
    return mix(g / per, nitida, detalle(per, w));
  }
  /** El rayado de grabado de los tonos (vanos, sombras), en la pantalla como el de los árboles: líneas
   *  a 45° cada 4 píxeles, más gruesas cuanto más oscuro el tono y, pasado 0,5, cruzadas. Al ir en
   *  píxeles, no hace moiré a ninguna distancia. */
  float rayadoPantalla(float tono) {
    vec2 f = gl_FragCoord.xy;
    float a = abs(fract((f.x + f.y) * 0.25) - 0.5) * 2.0;
    float b = abs(fract((f.x - f.y) * 0.25) - 0.5) * 2.0;
    return max(1.0 - smoothstep(tono - 0.15, tono + 0.15, a), 1.0 - smoothstep(tono - 0.65, tono - 0.35, b));
  }
  /** Ruido de valor: las manchas de la cal, el barro y el óxido. */
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = azar(i.x + i.y * 57.0), b = azar(i.x + 1.0 + i.y * 57.0);
    float c = azar(i.x + (i.y + 1.0) * 57.0), d = azar(i.x + 1.0 + (i.y + 1.0) * 57.0);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  /** Manchas: dos octavas de ruido en una grilla girada, para que no se vea la cuadrícula. */
  float manchas(vec2 p) {
    p = mat2(0.8, -0.6, 0.6, 0.8) * p;
    return 0.65 * ruido(p) + 0.35 * ruido(mat2(0.8, 0.6, -0.6, 0.8) * p * 2.3 + 17.0);
  }`

export const GLSL_VANOS = /* glsl */ `
  const float NADA = 0.0, VENTANA = 1.0, PUERTA = 2.0, VIDRIERA = 3.0, BALCON = 4.0;
  const vec3 HIERRO = vec3(0.09, 0.09, 0.10);

  /** Qué va en el paño i del piso. Arriba, ventanas (o puertas de balcón: todas en el primer piso de
   *  las guzmancistas, algunas en las eclécticas y las públicas). En la planta baja, una puerta por
   *  pared (en el medio, en las públicas); las modernas, vidrieras de local; los ranchos y las orillas,
   *  una o dos ventanas junto a la puerta; el resto, ventanas con algún paño ciego. */
  float tipoDeVano(Medidas m, float estilo, float sem, float i, float n, float piso) {
    float r = azar(sem + i * 7.77 + piso * 3.17);
    if (piso > 0.5) {
      if (es(estilo, ESTILO_GUZMANCISTA) && piso < 1.5) return BALCON;
      if ((es(estilo, ESTILO_ECLECTICO) || es(estilo, ESTILO_PUBLICO)) && r < 0.6) return BALCON;
      return VENTANA;
    }
    float puerta = es(estilo, ESTILO_PUBLICO) ? floor(0.5 * n) : floor(azar(sem * 1.9 + 0.3) * n);
    // las paredes cortas (los polígonos tienen muchas) no llevan todas su puerta
    float conPuerta = es(estilo, ESTILO_PUBLICO) ? 0.1 + 0.08 * n : 0.35 + 0.15 * n;
    bool esLaPuerta = abs(i - puerta) < 0.5 && azar(sem * 2.3 + 0.7) < conPuerta;
    if (es(estilo, ESTILO_MODERNO)) return esLaPuerta ? PUERTA : (r < 0.7 ? VIDRIERA : VENTANA);
    if (esLaPuerta) return PUERTA;
    if (es(estilo, ESTILO_RANCHO)) return abs(i - puerta) < 1.5 && r < 0.6 ? VENTANA : NADA;
    if (es(estilo, ESTILO_ORILLAS)) return abs(i - puerta) < 2.5 && r < 0.65 ? VENTANA : NADA;
    if (r < m.ciegos) return NADA;
    return r > 0.9 && !es(estilo, ESTILO_COLONIAL) ? PUERTA : VENTANA;
  }

  /** El rectángulo del vano dentro del piso: (centro en y, medio ancho, medio alto). */
  vec3 rectVano(float tipo, Medidas m, float p) {
    float tope = max(0.5 * p - 0.3, 0.3); // que quede muro entre paño y paño
    if (es(tipo, PUERTA)) return vec3(0.5 * m.puertaAlto, min(m.puertaMedio, tope), 0.5 * m.puertaAlto);
    if (es(tipo, VIDRIERA)) return vec3(1.7, max(0.5 * p - 0.25, 0.4), 1.3);
    if (es(tipo, BALCON)) return vec3(0.5 * (0.15 + m.dintel), min(m.medio, tope), 0.5 * (m.dintel - 0.15));
    return vec3(0.5 * (m.alfeizar + m.dintel), min(m.medio, tope), 0.5 * (m.dintel - m.alfeizar));
  }

  /** El marco del vano y lo que lleva encima: liso en las republicanas y las quintas; con guardapolvo
   *  (frontón bajo) en las ventanas guzmancistas y públicas; con dintel y clave en las eclécticas; la
   *  portada de cal alrededor de la puerta colonial. Las modernas, las orillas y los ranchos, sin marco. */
  void marco(inout vec3 c, inout float k, float tipo, float estilo, vec2 q, vec2 e, float w) {
    float g = 0.0;
    if (es(estilo, ESTILO_COLONIAL)) g = es(tipo, PUERTA) ? 0.3 : 0.0;
    else if (es(estilo, ESTILO_REPUBLICANO) || es(estilo, ESTILO_QUINTA)) g = 0.1;
    else if (es(estilo, ESTILO_GUZMANCISTA) || es(estilo, ESTILO_ECLECTICO) || es(estilo, ESTILO_PUBLICO)) g = 0.15;
    if (g <= 0.0) return;
    vec3 claro = c * 1.1 + 0.03;
    float dm = caja(q, e + g);
    c = mix(c, claro, lleno(dm, w) * (1.0 - lleno(caja(q, e), w)));
    k = max(k, trazo(dm, 0.012, w));
    if (es(tipo, PUERTA)) return;
    float sobre = q.y - e.y - g; // desde lo alto del marco
    float ancho = lleno(abs(q.x) - (e.x + g + 0.12), w);
    if (es(estilo, ESTILO_GUZMANCISTA) || es(estilo, ESTILO_PUBLICO)) {
      // el guardapolvo: una cornisita y, encima, un frontón triangular bajo
      float cornisita = banda(sobre, 0.0, 0.07, w) * ancho;
      float fronton = max(0.07 - sobre, (sobre - 0.07) - 0.26 * (1.0 - abs(q.x) / (e.x + g + 0.12)));
      c = mix(c, claro, max(cornisita, lleno(fronton, w)));
      c *= 1.0 - 0.3 * banda(sobre, -0.06, 0.0, w) * ancho; // la sombra que echa
      k = max(k, max(trazo(fronton, 0.012, w), trazo(sobre, 0.012, w) * ancho));
    } else if (es(estilo, ESTILO_ECLECTICO)) {
      // dintel saliente con su clave en el medio
      float dintel = banda(sobre, 0.0, 0.12, w) * ancho;
      float clave = lleno(caja(vec2(q.x * (1.0 + 0.8 * (q.y - e.y)), q.y - e.y - 0.06), vec2(0.1, 0.16)), w);
      c = mix(c, claro, max(dintel, clave));
      c *= 1.0 - 0.3 * banda(sobre, -0.06, 0.0, w) * ancho;
      k = max(k, max(trazo(sobre - 0.12, 0.012, w) * ancho, trazo(sobre, 0.012, w) * ancho));
    }
  }

  /** Reja colonial de balaustres torneados, volada: su caja de madera, la repisa abajo, el tejadillo
   *  arriba y la sombra que echa en la pared. */
  void rejaDeMadera(inout vec3 c, inout float k, float semilla, float estilo, vec2 q, vec2 e, vec2 w2) {
    float w = max(w2.x, w2.y);
    vec3 mad = madera(semilla, estilo) * 0.85;
    float dentro = lleno(caja(q, e), w);
    float torneado = 0.035 + 0.03 * abs(sin(q.y * 9.0)); // el balaustre se hincha y se adelgaza
    float balaustres = barras(q.x + e.x, 0.13, torneado, w2.x) * dentro;
    float travesanos = (banda(q.y, -e.y, -e.y + 0.08, w2.y) + banda(q.y, e.y - 0.08, e.y, w2.y)) * dentro;
    float bastidor = lleno(caja(q, e + 0.09), w) * (1.0 - dentro);
    float repisa = banda(q.y, -e.y - 0.24, -e.y - 0.09, w2.y) * lleno(abs(q.x) - e.x - 0.18, w2.x);
    float sobre = q.y - e.y - 0.09;
    float tejadillo = banda(sobre, 0.0, 0.2, w2.y) * lleno(abs(q.x) - (e.x + 0.24 - 0.7 * sobre), w2.x);
    float sombra = banda(q.y, -e.y - 0.6, -e.y - 0.24, w2.y) * smoothstep(-e.y - 0.6, -e.y - 0.24, q.y)
      * lleno(abs(q.x) - e.x - 0.15, w2.x);
    c *= 1.0 - 0.35 * sombra;
    c = mix(c, mad, max(max(balaustres, travesanos), max(bastidor, repisa)));
    c = mix(c, vec3(0.50, 0.31, 0.23), tejadillo);
    k = max(k, max(max(balaustres, travesanos), 0.5 * max(bastidor, repisa)));
    k = max(k, max(tejadillo * (0.3 + 0.7 * barras(q.x, 0.1, 0.03, w2.x)), 0.4 * sombra));
  }

  /** Reja de hierro de las ventanas bajas: barrotes finos y dos travesaños. */
  void rejaDeHierro(inout vec3 c, inout float k, vec2 q, vec2 e, vec2 w2) {
    float dentro = lleno(caja(q, e), max(w2.x, w2.y));
    float barrotes = barras(q.x + e.x, 0.12, 0.022, w2.x);
    float travesanos = barras(q.y + e.y - 0.3, max(2.0 * e.y - 0.6, 0.3), 0.03, w2.y);
    float hierro = max(barrotes, travesanos) * dentro;
    c = mix(c, HIERRO, hierro);
    k = max(k, hierro);
  }

  /** Las rejas: de madera torneada y voladas en las coloniales; de hierro en las ventanas bajas de las
   *  demás. Las modernas, las orillas y los ranchos, sin reja. */
  void enrejado(inout vec3 c, inout float k, float estilo, float semilla, float piso, vec2 q, vec2 e, vec2 w2) {
    if (es(estilo, ESTILO_MODERNO) || es(estilo, ESTILO_RANCHO) || es(estilo, ESTILO_ORILLAS)) return;
    if (es(estilo, ESTILO_COLONIAL)) rejaDeMadera(c, k, semilla, estilo, q, e, w2);
    else if (piso < 0.5) rejaDeHierro(c, k, q, e, w2);
  }

  /** El balcón de una puerta de balcón: la losa de piedra, los barrotes y el pasamanos de hierro. */
  void balcon(inout vec3 c, inout float k, float x, float y, vec2 e, vec2 w2) {
    float en = lleno(abs(x) - e.x - 0.3, w2.x);
    float losa = banda(y, 0.0, 0.14, w2.y) * en;
    float baranda = banda(y, 0.14, 1.05, w2.y) * en;
    float hierro = max(barras(x, 0.11, 0.02, w2.x) * baranda, banda(y, 1.0, 1.06, w2.y) * en);
    c *= 1.0 - 0.15 * baranda; // la sombra de la baranda en la pared y en el vano
    c = mix(c, c * 1.08 + 0.03, losa);
    c *= 1.0 - 0.45 * banda(y, 0.0, 0.04, w2.y) * en; // el canto de abajo de la losa
    c = mix(c, HIERRO, hierro);
    k = max(k, max(hierro, max(trazo(y - 0.14, 0.012, w2.y), trazo(y, 0.015, w2.y)) * en));
  }

  /** La vidriera de local de las modernas: vidrio con reflejo y montantes; encima, el letrero. */
  void vidriera(inout vec3 c, inout float k, float sem, float i, vec2 q, vec2 e, vec2 w2) {
    float w = max(w2.x, w2.y);
    float d = caja(q, e);
    float dentro = lleno(d, w);
    vec3 vidrio = mix(vec3(0.13, 0.16, 0.19), vec3(0.40, 0.45, 0.50), 0.25 + 0.5 * smoothstep(-e.y, e.y, q.y));
    float montantes = max(barras(q.x + e.x, 1.0, 0.05, w2.x), banda(q.y, e.y - 0.62, e.y - 0.56, w2.y));
    c = mix(c, mix(vidrio, vec3(0.22, 0.22, 0.22), montantes), dentro);
    k = mix(k, 0.35 + 0.4 * barras(q.x, 0.14, 0.05, w2.x) + 0.25 * montantes, dentro);
    k = max(k, trazo(d, 0.02, w));
    // el letrero, de un color por local, con renglones de "letras"
    vec2 l = vec2(q.x, q.y - e.y - 0.4);
    float dl = caja(l, vec2(e.x, 0.24));
    float letrero = lleno(dl, w);
    float ka = azar(sem * 2.7 + i * 1.3);
    vec3 pintura = ka < 0.3 ? vec3(0.55, 0.16, 0.12) : ka < 0.55 ? vec3(0.16, 0.30, 0.22) : ka < 0.8 ? vec3(0.16, 0.22, 0.40) : vec3(0.85, 0.78, 0.6);
    float letras = barras(l.x, 0.17, 0.09, w2.x) * banda(l.y, -0.1, 0.1, w2.y) * step(0.25, azar(floor(l.x / 0.17) + sem))
      * lleno(abs(l.x) - e.x + 0.25, w2.x);
    c = mix(c, mix(pintura, vec3(0.95, 0.92, 0.84), letras), letrero);
    k = max(k, max(trazo(dl, 0.015, w), letras * letrero * 0.8));
  }

  /** Un vano: el adentro oscuro (con el zaguán y el patio al fondo, en la puerta colonial), o postigos y
   *  puertas de madera cerrados, según la semilla; la sombra del hueco, la reja, el balcón y el marco.
   *  En tinta: el adentro rayado, la madera con sus tablillas o tableros, el contorno a pluma. */
  void vano(inout vec3 c, inout float k, float tipo, Medidas m, float estilo, float semilla, float sem,
      float i, float piso, float p, float x, float y, vec2 w2) {
    if (tipo < 0.5) return;
    vec3 r = rectVano(tipo, m, p);
    vec2 q = vec2(x, y - r.x), e = r.yz;
    if (es(tipo, VIDRIERA)) { vidriera(c, k, sem, i, q, e, w2); return; }
    float w = max(w2.x, w2.y);
    float d = caja(q, e);
    float dentro = lleno(d, w);
    float cerrado = step(es(tipo, PUERTA) ? 0.4 : 0.5, azar(sem * 3.3 + i * 5.1 + piso * 1.7));

    vec3 adentro = OSCURO;
    float tAdentro = 0.35 + 0.65 * rayadoPantalla(0.8);
    if (es(tipo, PUERTA) && es(estilo, ESTILO_COLONIAL)) {
      float patio = lleno(caja(q - vec2(0.0, -0.3 * e.y), vec2(0.3 * e.x, 0.55 * e.y)), w);
      adentro = mix(adentro, vec3(0.62, 0.56, 0.42), 0.8 * patio);
      tAdentro *= 1.0 - 0.85 * patio; // en tinta, el patio del fondo queda en papel
    } else if (!es(estilo, ESTILO_COLONIAL) && !es(estilo, ESTILO_RANCHO)) {
      adentro += vec3(0.06, 0.07, 0.08) * smoothstep(-e.y, e.y, q.y); // el reflejo del vidrio
    }

    vec3 mad = madera(semilla, estilo);
    bool persiana = !es(tipo, PUERTA) && !es(estilo, ESTILO_COLONIAL) && !es(estilo, ESTILO_RANCHO);
    float tablillas = barras(q.y, 0.09, 0.03, w2.y);
    float junta = trazo(q.x, 0.012, w2.x) * step(0.3, e.x); // la junta entre las dos hojas
    float tablero = caja(vec2(abs(q.x) - 0.5 * e.x, abs(q.y) - 0.45 * e.y), vec2(0.3 * e.x, 0.36 * e.y));
    if (es(estilo, ESTILO_RANCHO)) { // tablas verticales, sin tableros
      mad = vec3(0.36, 0.31, 0.25);
      tablillas = barras(q.x, 0.18, 0.025, w2.x);
      persiana = true;
      junta = 0.0;
    }
    vec3 cerradoColor = mad * (persiana ? 1.0 - 0.25 * tablillas : 1.0 - 0.18 * lleno(tablero, w)) * (1.0 - 0.5 * junta);
    float tCerrado = persiana ? 0.15 + 0.55 * tablillas : 0.12 + max(junta, trazo(tablero, 0.01, w));

    c = mix(c, mix(adentro, cerradoColor, cerrado), dentro);
    k = mix(k, mix(tAdentro, tCerrado, cerrado), dentro);
    c *= 1.0 - 0.3 * dentro * (1.0 - smoothstep(0.0, 0.18, e.y - q.y)); // la sombra del dintel en el hueco
    k = max(k, trazo(d, 0.015, w));
    if (es(estilo, ESTILO_MODERNO) && es(tipo, VENTANA)) { // la ventana corrida: montantes de metal claro
      float montantes = barras(q.x + e.x, 0.8, 0.04, w2.x) * dentro;
      c = mix(c, vec3(0.80, 0.79, 0.76), montantes);
      k = max(k, montantes);
    }

    if (es(tipo, VENTANA)) enrejado(c, k, estilo, semilla, piso, q, e, w2);
    if (es(tipo, BALCON)) balcon(c, k, x, y, e, w2);
    marco(c, k, tipo, estilo, q, e, w);
  }

  /** El corredor de la quinta: en la planta baja, entre columnas, la sombra del porche, su baranda de
   *  balaustres blancos y la viga de arriba (los paños de las puntas quedan cerrados). */
  void porche(inout vec3 c, inout float k, float estilo, float i, float n, float piso, float x, float y, float p, vec2 w2) {
    if (!es(estilo, ESTILO_QUINTA) || piso > 0.5 || n < 2.5 || i < 0.5 || i > n - 1.5) return;
    float columna = lleno(0.5 * p - abs(x) - 0.2, w2.x);
    float hueco = banda(y, 0.35, 3.1, w2.y) * (1.0 - columna);
    float viga = banda(y, 3.1, 3.4, w2.y);
    float baranda = banda(y, 0.35, 1.15, w2.y) * hueco;
    float balaustres = max(barras(x, 0.16, 0.05, w2.x) * baranda, banda(y, 1.1, 1.17, w2.y) * hueco);
    c *= 1.0 - 0.5 * hueco;
    c = mix(c, c * (0.85 + 0.25 * cos((0.5 * p - abs(x)) * 7.8)), columna * step(y, 3.1)); // la columna, redonda
    c = mix(c, vec3(0.9, 0.88, 0.82), balaustres);
    c = mix(c, c * 1.08 + 0.02, viga);
    k = max(k, hueco * rayadoPantalla(0.55)) * (1.0 - balaustres); // los balaustres, en papel
    k = max(k, max(trazo(0.5 * p - abs(x) - 0.2, 0.012, w2.x) * step(y, 3.1), trazo(y - 3.1, 0.012, w2.y)));
  }`
