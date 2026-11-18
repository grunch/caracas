import { ALTO_PISO } from '../ciudad.js'
import { GLSL_DIBUJO, GLSL_VANOS } from './vanos.js'

/**
 * Techos y fachadas según el estilo de cada casa (aInfo.z, tools/geo/estilos.py):
 * 0 colonial · 1 republicano · 2 guzmancista · 3 ecléctico · 4 moderno · 5 quinta · 6 rancho ·
 * 7 casa de las orillas · 8 galpón de estación · 9 edificio público.
 * No hay texturas de fachada: todo sale de las coordenadas de la pared (aPared, src/ciudad.js), la
 * altura sobre la base de la casa, los pisos, el estilo y la semilla. fachadaEn() da el color de la
 * pared y la tinta que le toca en el grabado; de lejos, los detalles se apagan a su tono medio.
 */
export const GLSL_FACHADA = /* glsl */ `
  const float ESTILO_COLONIAL = 0.0, ESTILO_REPUBLICANO = 1.0, ESTILO_GUZMANCISTA = 2.0, ESTILO_ECLECTICO = 3.0,
    ESTILO_MODERNO = 4.0, ESTILO_QUINTA = 5.0, ESTILO_RANCHO = 6.0, ESTILO_ORILLAS = 7.0, ESTILO_GALPON = 8.0, ESTILO_PUBLICO = 9.0;
  bool es(float estilo, float cual) { return abs(estilo - cual) < 0.5; }

  /** La teja criolla: cada techo un poco distinto, algunos más gastados u oscuros. */
  vec3 teja(float semilla) {
    vec3 nueva = vec3(0.71, 0.38, 0.26), vieja = vec3(0.55, 0.36, 0.28);
    return mix(nueva, vieja, azar(semilla * 1.7)) * (0.9 + 0.2 * azar(semilla * 3.1));
  }
  /** Azotea de cemento o de baldosa clara. */
  vec3 azotea(float semilla) { return vec3(0.66, 0.63, 0.57) * (0.92 + 0.12 * azar(semilla * 2.3)); }
  /** Zinc: gris azulado, con óxido en las más viejas. */
  vec3 zinc(float semilla) { return mix(vec3(0.55, 0.57, 0.58), vec3(0.50, 0.36, 0.27), azar(semilla * 4.7) * 0.8); }

  vec3 techoColor(float semilla, float estilo) {
    if (es(estilo, ESTILO_PUBLICO) || es(estilo, ESTILO_MODERNO)) return azotea(semilla);
    if (es(estilo, ESTILO_RANCHO) || es(estilo, ESTILO_GALPON)) return zinc(semilla);
    if (es(estilo, ESTILO_ECLECTICO) && azar(semilla * 6.1) < 0.5) return azotea(semilla);
    return teja(semilla);
  }

  /** La cal: blanca las más; si no, crema, ocre, rosa viejo o añil claro. */
  vec3 cal(float semilla) {
    float k = azar(semilla * 5.3);
    if (k < 0.45) return vec3(0.93, 0.91, 0.85);
    if (k < 0.65) return vec3(0.92, 0.85, 0.70);
    if (k < 0.80) return vec3(0.86, 0.72, 0.50);
    if (k < 0.92) return vec3(0.85, 0.68, 0.62);
    return vec3(0.72, 0.78, 0.84);
  }
  /** Los pasteles de fin de siglo: ocre, rosa, crema, verde agua. */
  vec3 pastel(float semilla) {
    float k = azar(semilla * 7.9);
    if (k < 0.3) return vec3(0.88, 0.76, 0.55);
    if (k < 0.55) return vec3(0.88, 0.72, 0.68);
    if (k < 0.8) return vec3(0.93, 0.87, 0.73);
    return vec3(0.74, 0.84, 0.78);
  }

  /** Los ranchos: la mitad de chapa de zinc, la otra de bahareque. */
  bool esDeZinc(float semilla) { return azar(semilla * 8.3) > 0.5; }

  vec3 paredBase(float semilla, float estilo) {
    if (es(estilo, ESTILO_RANCHO)) return esDeZinc(semilla) ? vec3(0.55, 0.57, 0.58) : vec3(0.58, 0.48, 0.38);
    if (es(estilo, ESTILO_MODERNO)) return mix(vec3(0.92, 0.91, 0.88), vec3(0.78, 0.77, 0.74), azar(semilla * 2.9));
    if (es(estilo, ESTILO_ECLECTICO)) return mix(vec3(0.90, 0.85, 0.74), vec3(0.76, 0.73, 0.68), azar(semilla * 3.7)); // crema o piedra
    if (es(estilo, ESTILO_REPUBLICANO) || es(estilo, ESTILO_GUZMANCISTA)) return pastel(semilla);
    if (es(estilo, ESTILO_PUBLICO)) return mix(vec3(0.88, 0.85, 0.78), vec3(0.78, 0.74, 0.66), azar(semilla * 3.1)); // piedra clara
    if (es(estilo, ESTILO_ORILLAS)) return cal(semilla) * 0.9; // cal más gastada
    // los galpones de las estaciones: revoque liso gris claro o ladrillo a la vista
    if (es(estilo, ESTILO_GALPON)) return azar(semilla * 9.7) < 0.6 ? vec3(0.80, 0.78, 0.72) : vec3(0.62, 0.40, 0.31);
    return cal(semilla);
  }

  /** La pared, con zócalo hasta 0,8 m sobre la base de la casa (los ranchos no tienen). */
  vec3 paredColor(float semilla, float estilo, float sobreLaBase) {
    float zocalo = es(estilo, ESTILO_RANCHO) ? 1.0 : mix(0.72, 1.0, step(0.8, sobreLaBase));
    return paredBase(semilla, estilo) * zocalo;
  }

  const float ALTO_PISO = ${ALTO_PISO.toFixed(2)};
  const vec3 TINTA = vec3(0.16, 0.13, 0.11);
  const vec3 OSCURO = vec3(0.10, 0.09, 0.085); // el adentro de un vano abierto

  /** Las medidas de cada estilo, en metros: el paño (de eje a eje de los vanos), el medio ancho del
   *  vano, el alféizar y el dintel de la ventana (desde el piso), el medio ancho y el alto de la puerta,
   *  qué parte de los paños de la planta baja quedan ciegos y cuánto ocupa el remate (alero, cornisa,
   *  balaustrada o pretil) en lo alto de la pared. */
  struct Medidas { float pano; float medio; float alfeizar; float dintel; float puertaMedio; float puertaAlto; float ciegos; float remate; };
  Medidas medidas(float estilo) {
    // colonial y republicano, como en la litografía de la calle de Caracas (1843): muro liso, una ventana
    // alta y angosta cada 3,5 m (casi de piso a techo), puerta grande, cornisa corrida y alero corto
    if (es(estilo, ESTILO_COLONIAL)) return Medidas(3.8, 0.48, 0.55, 3.25, 1.1, 3.3, 0.3, 0.55);
    if (es(estilo, ESTILO_REPUBLICANO)) return Medidas(3.4, 0.5, 0.5, 3.25, 0.85, 3.3, 0.15, 0.55);
    if (es(estilo, ESTILO_GUZMANCISTA)) return Medidas(3.4, 0.55, 0.6, 2.6, 0.7, 3.0, 0.1, 1.05);
    if (es(estilo, ESTILO_ECLECTICO)) return Medidas(3.3, 0.6, 0.75, 2.75, 0.75, 3.05, 0.1, 1.0);
    if (es(estilo, ESTILO_MODERNO)) return Medidas(4.4, 1.6, 0.95, 2.55, 0.9, 2.9, 0.05, 0.8);
    if (es(estilo, ESTILO_QUINTA)) return Medidas(4.0, 0.65, 0.85, 2.85, 0.7, 2.9, 0.2, 0.55);
    if (es(estilo, ESTILO_RANCHO)) return Medidas(3.0, 0.35, 1.05, 1.8, 0.45, 2.0, 0.5, 0.12);
    if (es(estilo, ESTILO_ORILLAS)) return Medidas(3.4, 0.5, 1.0, 2.6, 0.6, 2.8, 0.45, 0.3);
    if (es(estilo, ESTILO_GALPON)) return Medidas(6.0, 0.8, 2.2, 3.3, 1.5, 3.4, 0.5, 0.15); // muro largo, ventanas altas, portón
    return Medidas(4.2, 0.7, 0.8, 2.7, 1.1, 3.3, 0.0, 1.0); // público
  }

  /** La carpintería de la casa: marrón, verde o azul gris (las coloniales, casi siempre marrón). */
  vec3 madera(float semilla, float estilo) {
    float k = azar(semilla * 9.1);
    if (k < (es(estilo, ESTILO_COLONIAL) ? 0.7 : 0.4)) return vec3(0.34, 0.22, 0.13);
    if (k < 0.85) return vec3(0.19, 0.31, 0.22);
    return vec3(0.25, 0.32, 0.40);
  }
  ${GLSL_DIBUJO}
  ${GLSL_VANOS}

  // --- el muro ---

  /** Chapa de zinc acanalada, con chorreaduras de óxido. */
  void chapaAcanalada(inout vec3 c, inout float k, float sem, float u, float h, vec2 w2) {
    float onda = barras(u, 0.076, 0.03, w2.x);
    float oxido = smoothstep(0.5, 0.8, manchas(vec2(u * 1.3, h * 0.35) + sem));
    float junta = barras(u, 0.84, 0.03, w2.x);
    c *= (1.0 - 0.22 * onda) * (1.0 - 0.3 * junta);
    c = mix(c, vec3(0.47, 0.29, 0.18), 0.6 * oxido);
    k = max(k, 0.45 * onda + 0.6 * junta + 0.2 * oxido);
  }
  /** Bahareque: barro manchado y, donde se cayó el friso, la caña a la vista. */
  void bahareque(inout vec3 c, inout float k, float sem, float u, float h, vec2 w2) {
    c *= 0.88 + 0.2 * manchas(vec2(u, h) * 1.7 + sem);
    float caido = smoothstep(0.62, 0.66, manchas(vec2(u, h) * 0.9 + sem * 1.3));
    float cana = barras(u, 0.06, 0.03, w2.x);
    c = mix(c, vec3(0.42, 0.34, 0.24) * (1.0 - 0.3 * cana), caido);
    k = max(k, caido * (0.2 + 0.5 * cana));
  }
  /** La cal gastada de las orillas: manchas, y el barro de la calle salpicado abajo. */
  void calGastada(inout vec3 c, inout float k, float sem, float u, float h, vec2 w2) {
    float mancha = smoothstep(0.45, 0.75, manchas(vec2(u * 0.8, h * 0.5) + sem));
    c *= 1.0 - 0.14 * mancha;
    c = mix(c, vec3(0.58, 0.49, 0.39), 0.35 * (1.0 - smoothstep(0.0, 1.3, h)));
    k = max(k, mancha * rayadoPantalla(0.3));
  }
  /** Almohadillado de la planta baja (eclécticas y públicas): hiladas de sillares con sus juntas. */
  void almohadillado(inout vec3 c, inout float k, float estilo, float piso, float u, float h, vec2 w2) {
    if (!(es(estilo, ESTILO_ECLECTICO) || es(estilo, ESTILO_PUBLICO)) || piso > 0.5) return;
    float en = banda(h, 0.8, ALTO_PISO - 0.45, w2.y);
    float fila = floor((h - 0.8) / 0.5);
    float junta = max(barras(h - 0.8, 0.5, 0.035, w2.y), barras(u + 0.6 * mod(fila, 2.0), 1.2, 0.035, w2.x));
    c *= 1.0 - 0.3 * junta * en;
    k = max(k, 0.8 * junta * en);
  }
  /** El muro de cada estilo, antes de abrirle los vanos. */
  void textura(inout vec3 c, inout float k, float estilo, float semilla, float sem, float piso, float u, float h, vec2 w2) {
    if (es(estilo, ESTILO_RANCHO)) {
      if (esDeZinc(semilla)) chapaAcanalada(c, k, sem, u, h, w2);
      else bahareque(c, k, sem, u, h, w2);
      return;
    }
    if (es(estilo, ESTILO_ORILLAS)) calGastada(c, k, sem, u, h, w2);
    if (es(estilo, ESTILO_COLONIAL)) c *= 1.0 - 0.12 * manchas(vec2(u, h) * 3.0 + sem) * (1.0 - smoothstep(0.6, 1.0, h)); // zócalo salpicado de barro
    almohadillado(c, k, estilo, piso, u, h, w2);
    k = max(k, trazo(h - 0.8, 0.012, w2.y)); // el borde del zócalo
  }
  /** Pilastras entre paño y paño (guzmancistas y públicas). */
  void pilastras(inout vec3 c, inout float k, float estilo, float x, float p, float h, float hasta, vec2 w2) {
    if (!(es(estilo, ESTILO_GUZMANCISTA) || es(estilo, ESTILO_PUBLICO))) return;
    float d = 0.3 - (0.5 * p - abs(x)); // > 0 en la pilastra
    float en = banda(h, 0.8, hasta, w2.y);
    c = mix(c, c * 1.08 + 0.02, lleno(-d, w2.x) * en);
    c *= 1.0 - 0.25 * trazo(d, 0.02, w2.x) * en; // la sombra del canto
    k = max(k, trazo(d, 0.012, w2.x) * en);
  }
  /** Entre piso y piso: losas marcadas en las modernas; una imposta (moldura corrida) en las demás. */
  void losas(inout vec3 c, inout float k, float estilo, float piso, float pisos, float y, vec2 w2) {
    if (piso > pisos - 1.5) return;
    if (es(estilo, ESTILO_MODERNO)) {
      c = mix(c, c * 0.86, banda(y, ALTO_PISO - 0.32, ALTO_PISO + 0.01, w2.y));
      k = max(k, trazo(y - (ALTO_PISO - 0.32), 0.015, w2.y));
      return;
    }
    c = mix(c, c * 1.08 + 0.02, banda(y, ALTO_PISO - 0.3, ALTO_PISO - 0.14, w2.y));
    c *= 1.0 - 0.3 * banda(y, ALTO_PISO - 0.36, ALTO_PISO - 0.3, w2.y);
    k = max(k, max(trazo(y - (ALTO_PISO - 0.3), 0.012, w2.y), trazo(y - (ALTO_PISO - 0.14), 0.012, w2.y)));
  }

  // --- el remate: t = cuánto falta hasta lo alto de la pared ---

  /** El alero: la sombra honda bajo el tejado y, en las coloniales, los canecillos (las puntas de las vigas). */
  void alero(inout vec3 c, inout float k, float conCanecillos, float u, float t, float alto, vec2 w2) {
    float sombra = 1.0 - smoothstep(0.0, alto, t);
    float canecillos = conCanecillos * barras(u, 0.5, 0.1, w2.x) * banda(t, 0.04, 0.17, w2.y);
    c *= 1.0 - 0.5 * sombra;
    c = mix(c, vec3(0.24, 0.16, 0.10), max(canecillos, banda(t, -0.1, 0.04, w2.y)));
    k = max(k, max(sombra * rayadoPantalla(0.2 + 0.5 * sombra), canecillos));
  }
  /** Cornisa moldurada de alto 'alto': corona clara, su sombra, el friso, un filete y la sombra de abajo. */
  void cornisa(inout vec3 c, inout float k, float t, float alto, vec2 w2) {
    float w = w2.y;
    c = mix(c, c * 1.12 + 0.03, banda(t, -0.1, 0.1, w));
    c *= 1.0 - 0.38 * banda(t, 0.1, 0.17, w);
    c = mix(c, c * 1.1 + 0.02, banda(t, alto - 0.12, alto - 0.06, w));
    c *= 1.0 - 0.25 * banda(t, alto - 0.06, alto, w) * (1.0 - smoothstep(alto - 0.06, alto, t));
    k = max(k, max(max(trazo(t - 0.1, 0.012, w), trazo(t - 0.17, 0.012, w)), max(trazo(t - (alto - 0.12), 0.01, w), trazo(t - alto, 0.012, w))));
    k = max(k, 0.7 * banda(t, 0.1, 0.17, w));
  }
  /** Dentículos: tacos de 10 cm cada 20, en una banda de 16 cm que arranca en t = 0. */
  void denticulos(inout vec3 c, inout float k, float u, float t, vec2 w2) {
    float hueco = (1.0 - barras(u, 0.2, 0.1, w2.x)) * banda(t, 0.0, 0.16, w2.y);
    c *= 1.0 - 0.3 * hueco;
    k = max(k, 0.75 * hueco);
  }
  /** Balaustrada en el pretil: pasamanos, balaustres torneados con pedestales en los ejes y la base. */
  void balaustrada(inout vec3 c, inout float k, float x, float p, float t, float alto, vec2 w2) {
    float pedestal = lleno(0.5 * p - abs(x) - 0.2, w2.x);
    float torneado = 0.07 + 0.04 * sin((t - 0.09) / (alto - 0.17) * 3.1416);
    float entre = banda(t, 0.09, alto - 0.08, w2.y) * (1.0 - pedestal);
    float hueco = (1.0 - barras(x, 0.26, 2.0 * torneado, w2.x)) * entre;
    c = mix(c, c * 1.08 + 0.02, banda(t, -0.1, alto, w2.y)); // la piedra del pretil, clara
    c *= 1.0 - 0.45 * hueco;
    k = max(k, max(0.7 * hueco, max(trazo(t - 0.09, 0.012, w2.y), trazo(t - alto + 0.08, 0.012, w2.y)) * (1.0 - pedestal)));
    k = max(k, trazo(0.5 * p - abs(x) - 0.2, 0.012, w2.x) * banda(t, 0.0, alto, w2.y));
  }
  /** El pretil liso de las modernas: albardilla, su sombra, y el canto de la losa del techo abajo. */
  void pretil(inout vec3 c, inout float k, float t, float alto, vec2 w2) {
    float w = w2.y;
    c = mix(c, c * 1.1 + 0.03, banda(t, -0.1, 0.07, w));
    c *= (1.0 - 0.35 * banda(t, 0.07, 0.11, w)) * (1.0 - 0.14 * banda(t, alto - 0.08, alto, w));
    k = max(k, max(trazo(t - 0.07, 0.015, w), trazo(t - alto, 0.015, w)));
  }
  /** Lo alto de la pared de cada estilo. */
  void remate(inout vec3 c, inout float k, float estilo, float semilla, Medidas m, float x, float p, float u, float t, vec2 w2) {
    if (t > m.remate + 0.1) return;
    bool quintaColonial = es(estilo, ESTILO_QUINTA) && azar(semilla * 4.1) < 0.5;
    if (es(estilo, ESTILO_COLONIAL) || quintaColonial) { // la cornisa corrida y, encima, el alero corto
      cornisa(c, k, t - 0.2, 0.35, w2);
      alero(c, k, 1.0, u, t, 0.2, w2);
    }
    else if (es(estilo, ESTILO_ORILLAS) || es(estilo, ESTILO_RANCHO) || es(estilo, ESTILO_GALPON)) alero(c, k, 0.0, u, t, m.remate, w2);
    else if (es(estilo, ESTILO_MODERNO)) pretil(c, k, t, m.remate, w2);
    else if (es(estilo, ESTILO_GUZMANCISTA)) {
      balaustrada(c, k, x, p, t, 0.55, w2);
      cornisa(c, k, t - 0.55, 0.5, w2);
      denticulos(c, k, u, t - 0.55 - 0.2, w2);
    } else if (es(estilo, ESTILO_ECLECTICO) || es(estilo, ESTILO_PUBLICO)) {
      cornisa(c, k, t, 0.62, w2);
      denticulos(c, k, u, t - 0.2, w2);
      // el friso, con una tarja en cada paño
      float tarja = caja(vec2(x, t - 0.8), vec2(max(0.5 * p - 0.5, 0.2), 0.1));
      c = mix(c, c * 1.06, lleno(tarja, w2.y) * step(0.5, p));
      k = max(k, max(trazo(tarja, 0.01, max(w2.x, w2.y)), trazo(t - m.remate, 0.012, w2.y)));
    } else if (es(estilo, ESTILO_REPUBLICANO) || es(estilo, ESTILO_QUINTA)) cornisa(c, k, t, m.remate, w2);
  }

  /** Cuánto de la pared son vanos, para el tono medio de lejos. */
  float cobertura(Medidas m) {
    return clamp(2.0 * m.medio / m.pano * (m.dintel - m.alfeizar) / ALTO_PISO * (1.0 - 0.5 * m.ciegos), 0.0, 0.6);
  }

  /** La fachada de una pared: rgb, su color; a, su tinta en el grabado. pared = (metros desde la esquina,
   *  largo de la pared); h = altura sobre la base de la casa; info = aInfo; base = paredColor(); w2 =
   *  metros por píxel a lo largo y a lo alto (fwidth, tomado en el main fuera de toda rama). La pared se
   *  parte en paños y pisos; cada paño lleva su vano según el estilo y la semilla. */
  vec4 fachadaEn(vec2 pared, float h, vec4 info, vec3 base, vec2 w2) {
    float largo = pared.y;
    if (largo < 0.01 || info.w < 0.5) return vec4(base, 0.0);
    float u = pared.x, semilla = info.y, estilo = info.z, pisos = info.w;
    Medidas m = medidas(estilo);
    float sem = fract(semilla * 0.0137) * 97.0 + fract(largo * 0.731) * 13.0; // cada pared, su reparto
    float alto = pisos * ALTO_PISO, t = alto - h;
    float piso = clamp(floor(h / ALTO_PISO), 0.0, pisos - 1.0), y = h - piso * ALTO_PISO;
    float n = largo < 1.8 ? 0.0 : max(1.0, floor(largo / m.pano + 0.3));
    float p = largo / max(n, 1.0);
    float i = clamp(floor(u / p), 0.0, max(n - 1.0, 0.0));
    float x = u - (i + 0.5) * p;

    // de lejos, el tono medio de la pared con sus vanos; tan lejos que no queda detalle, ni se dibuja
    float cerca = detalle(2.5, max(w2.x, w2.y));
    float cob = n > 0.5 ? cobertura(m) : 0.0;
    vec4 lejos = vec4(base * (1.0 - 0.4 * cob), 0.5 * cob);
    if (cerca <= 0.0) return lejos;

    vec3 c = base;
    float k = 0.0;
    textura(c, k, estilo, semilla, sem, piso, u, h, w2);
    pilastras(c, k, estilo, x, p, h, alto - m.remate, w2);
    losas(c, k, estilo, piso, pisos, y, w2);
    if (n > 0.5 && t > m.remate) vano(c, k, tipoDeVano(m, estilo, sem, i, n, piso), m, estilo, semilla, sem, i, piso, p, x, y, w2);
    porche(c, k, estilo, i, n, piso, x, y, p, w2);
    remate(c, k, estilo, semilla, m, x, p, u, t, w2);
    return mix(lejos, vec4(c, clamp(k, 0.0, 1.0)), cerca);
  }`
