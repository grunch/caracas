"""Tests de los solares de la época (specs/13 § 6, T82.9: el spike de F2)."""
from shapely.geometry import Polygon, Point

from solares_epoca import frente_objetivo_m, lotes_de_la_epoca, solares_de_epoca, CALLE_IZQ, CALLE_DER

METRO = 0.5


def _rect(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def test_el_frente_objetivo_crece_hacia_la_plaza():
    assert frente_objetivo_m(0) >= 18
    assert frente_objetivo_m(0) > frente_objetivo_m(300) > frente_objetivo_m(700)
    assert 9 <= frente_objetivo_m(2000) <= 11


def test_los_lotes_de_una_manzana_cubren_sus_frentes_sin_encimarse():
    manzana = _rect(0, 0, 220, 220)                 # 110 × 110 m
    lotes = lotes_de_la_epoca(manzana, frente_m=25, metro=METRO, semilla=3)
    figura = Polygon(manzana)
    assert 10 <= len(lotes) <= 16                    # 4 por lado; la esquina es del primer lado que la toma
    for i, a in enumerate(lotes):
        assert figura.buffer(1e-6).contains(a['huella'])
        assert a['huella'].exterior.distance(figura.exterior) < 1e-6          # da a la calle
        for b in lotes[i + 1:]:
            assert a['huella'].intersection(b['huella']).area < 1e-6
    esquinas = [a for a in lotes if a['calles'] & (CALLE_IZQ | CALLE_DER)]
    assert len(esquinas) >= 4
    # el marco: su frente sobre el borde y ev (−euy, eux) hacia adentro
    for a in lotes:
        ox, oy = a['marco']['origen']
        eux, euy = a['marco']['eu']
        assert figura.exterior.distance(Point(ox, oy)) < 1.0
        assert figura.contains(Point(ox + eux * 4 - euy * 4, oy + euy * 4 + eux * 4))


def test_las_manzanas_de_la_plaza_tienen_menos_casas_que_las_de_afuera():
    cerca = lotes_de_la_epoca(_rect(0, 0, 220, 220), frente_objetivo_m(100), METRO, 1)
    lejos = lotes_de_la_epoca(_rect(0, 0, 220, 220), frente_objetivo_m(800), METRO, 1)
    assert len(cerca) < len(lejos) <= 43


def _ciudad():
    casas = [_rect(10, 0, 30, 20), _rect(40, 0, 60, 20), _rect(1000, 0, 1020, 20)]
    vertices, techos = [], []
    for c in casas:
        techos.append([len(vertices) // 2, 4, 1, 0, 7])
        vertices += [float(x) for p in c for x in p]
    return {'vertices': vertices, 'techos': techos, 'vida': [[1, 0], [2, 0], [2, 0]], 'esquinas': [0, 0, 0],
            'vuelos': [255, 255, 255], 'marcos': [[0, 10.0, 0.0, 1.0, 0.0, 20.0, 20.0, 0, 15.0, 0, 0]], 'alas': []}


def test_la_epoca_cambia_sus_casas_por_las_de_sus_solares_sin_tocar_las_otras_epocas():
    ciudad = _ciudad()
    unidades = [{'id': 'M', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _rect(0, 0, 220, 220)}]
    nueva, informe = solares_de_epoca(ciudad, unidades, epoca=2, metro=METRO, plaza=(110, 110), sector=(0, 0, 300, 300))
    vida = nueva['vida']
    assert vida[0] == [1, 2]                       # la de 1772 sigue en 1772 y sale en 1843
    assert vida[1] == [3, 0]                       # la que nacía en 1843 nace en la época siguiente
    assert vida[2] == [2, 0]                       # fuera del sector, igual
    copia = [k for k in range(3, len(vida)) if nueva['techos'][k][:2] != [] and vida[k] == [3, 0]]
    assert copia, 'la casa de 1772 vuelve desde 1889 (una copia con su marco)'
    k = copia[0]
    assert any(m[0] == k for m in nueva['marcos'])
    propias = [k for k, v in enumerate(vida) if v == [2, 3]]
    assert informe['casas'] == len(propias) > 0
    vivas_1772 = [k for k, v in enumerate(vida) if v[0] <= 1 and (v[1] == 0 or 1 < v[1])]
    assert vivas_1772 == [0]
    for m in nueva['marcos']:
        assert 0 <= m[9] and m[9] + m[10] <= len(nueva['alas'])
    assert len(nueva['techos']) == len(vida) == len(nueva['esquinas']) == len(nueva['vuelos'])


def test_una_casa_que_solo_vivia_en_la_epoca_se_quita_no_queda_sin_vida():
    ciudad = _ciudad()
    ciudad['vida'][1] = [2, 3]
    unidades = [{'id': 'M', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _rect(0, 0, 220, 220)}]
    nueva, informe = solares_de_epoca(ciudad, unidades, epoca=2, metro=METRO, plaza=(110, 110), sector=(0, 0, 300, 300))
    assert informe['quitadas'] == 1
    assert all(n < 6 for n, _ in nueva['vida'])                  # ninguna vida fuera de las épocas
    assert len(nueva['techos']) == len(nueva['vida']) == len(nueva['esquinas']) == len(nueva['vuelos'])
    assert [1000.0, 0.0] in [nueva['vertices'][2 * t[0]:2 * t[0] + 2] for t in nueva['techos']]   # la de afuera sigue


def test_lo_techado_tiene_su_fondo_y_detras_queda_el_solar():
    from solares_epoca import techado_m, alas_del_lote
    from alas import SOLAR
    assert techado_m(100) > techado_m(800) >= 18
    alas = alas_del_lote(ancho_m=20, fondo_m=45, semilla=11, distancia_m=100, calles=0, crujia_m=7.5)
    hasta = max(a[4] for a in alas if a[0] != SOLAR)
    assert hasta <= techado_m(100) + 1e-6
    solar = [a for a in alas if a[0] == SOLAR]
    assert solar and abs(max(a[4] for a in solar) - 45) < 1e-6
