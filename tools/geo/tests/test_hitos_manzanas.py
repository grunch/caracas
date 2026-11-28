from copy import deepcopy
from hitos_manzanas import decidir, solapes, CABE, MAYOR, OCUPA_BUENA_PARTE, ROCE

METRO = .5  # 100 m = 200 px


def cuadro(x, y, ancho, alto):
    return [[x, y], [x+ancho, y], [x+ancho, y+alto], [x, y+alto]]


def manzana(id, x, y, ancho=200, alto=200, **extra):
    return {'id': id, 'poligono': cuadro(x, y, ancho, alto), **extra}


def hito(id, *plantas, nace=1, muere=0, suprime=None, **extra):
    return {'id': id, 'nace': nace, 'muere': muere, 'planta': list(plantas), 'suprime': suprime or [], **extra}


def decision(ms, hs, epoca=1):
    return {d['id']: d for d in decidir(ms, hs, epoca, METRO)}


def test_un_hito_chico_dentro_de_la_manzana_la_conserva():
    # Arrange: una iglesia de 30 × 40 m en una manzana de 100 × 100 m
    ms = [manzana('M', 0, 0)]
    hs = [hito('iglesia', cuadro(20, 20, 60, 80))]
    # Act
    d = decision(ms, hs)['M']
    # Assert
    assert not d['retirar']
    assert d['hitos'] == [{'hito': 'iglesia', 'clase': 'chico'}]
    assert abs(d['ocupacion']-.12) < 1e-9


def test_un_hito_que_ocupa_la_mayor_parte_retira_la_manzana():
    ms = [manzana('M', 0, 0)]
    hs = [hito('palacio', cuadro(10, 10, 180, 180))]
    d = decision(ms, hs)['M']
    assert d['retirar'] and d['motivo'] == 'ocupa la mayor parte'
    assert d['hitos'] == [{'hito': 'palacio', 'clase': 'grande'}]


def test_el_recinto_cuenta_aunque_los_edificios_sean_pocos():
    # dos pabellones chicos, pero el recinto (su zona de supresión) llena la manzana
    ms = [manzana('M', 0, 0)]
    hs = [hito('hospital', cuadro(20, 20, 30, 30), cuadro(140, 140, 30, 30), suprime=[cuadro(0, 0, 200, 200)])]
    assert decision(ms, hs)['M']['retirar']


def test_un_hito_mayor_que_las_manzanas_que_abarca_las_retira_salvo_las_que_roza():
    # Arrange: un recinto mayor que cada manzana de 100 × 100 m, que cubre 35 %, 12 % y 5 % de tres de ellas
    ms = [manzana('A', 0, 0), manzana('B', 0, 300), manzana('C', 0, 600)]
    recinto = [cuadro(130, 0, 300, 200), cuadro(0, 300, 200, 24), cuadro(0, 600, 200, 10)]
    hs = [hito('hospital', cuadro(140, 10, 20, 20), suprime=recinto)]
    # Act
    d = decision(ms, hs)
    # Assert
    assert d['A']['retirar'] and d['A']['motivo'] == 'el hito es mayor que la manzana'
    assert d['A']['hitos'] == [{'hito': 'hospital', 'clase': 'grande'}]
    assert d['B']['retirar']
    assert not d['C']['retirar'] and d['C']['hitos'] == [{'hito': 'hospital', 'clase': 'roce'}]


def test_un_hito_del_tamaño_de_la_manzana_vecina_no_la_retira_por_pisarla_en_un_15_por_ciento():
    # Arrange: el Cuartel San Carlos y U1843-0051-A0 (#248). Un recinto de 101 × 101 m (1,02 veces la manzana de
    # 100 × 100 m) que la pisa en una franja de 15 m: el resto de la manzana no es del hito
    ms = [manzana('vecina', 0, 0)]
    hs = [hito('cuartel', cuadro(-172, 0, 202, 202))]
    # Act
    d = decision(ms, hs)['vecina']
    # Assert
    assert 1 < 202*202/(200*200) < MAYOR
    assert not d['retirar']
    assert d['hitos'] == [{'hito': 'cuartel', 'clase': 'a caballo'}]


def test_el_mismo_cruce_con_un_recinto_claramente_mayor_si_retira_la_manzana():
    # un recinto de 130 × 101 m (1,31 veces la manzana) con la misma franja de 15 m sobre ella
    ms = [manzana('vecina', 0, 0)]
    hs = [hito('recinto', cuadro(-230, 0, 260, 202))]
    d = decision(ms, hs)['vecina']
    assert 260*202/(200*200) > MAYOR
    assert d['retirar'] and d['motivo'] == 'el hito es mayor que la manzana'


def test_un_hito_chico_a_caballo_del_borde_no_retira_la_manzana():
    # 40 % del templo sobre la manzana y el resto en la calle: no cabe, pero tampoco es mayor que ella
    ms = [manzana('M', 0, 0)]
    hs = [hito('templo', cuadro(160, 50, 100, 60))]
    d = decision(ms, hs)['M']
    assert not d['retirar']
    assert d['hitos'] == [{'hito': 'templo', 'clase': 'a caballo'}]


def test_dos_hitos_chicos_que_juntos_ocupan_la_mayor_parte_retiran_la_manzana():
    ms = [manzana('M', 0, 0)]
    hs = [hito('bloque-1', cuadro(0, 0, 200, 56)), hito('bloque-2', cuadro(0, 100, 200, 56))]
    d = decision(ms, hs)['M']
    assert d['retirar'] and abs(d['ocupacion']-.56) < 1e-9
    assert [h['clase'] for h in d['hitos']] == ['chico', 'chico']


def test_solo_cuentan_los_hitos_en_pie_en_la_epoca():
    ms = [manzana('M', 0, 0)]
    hs = [hito('carcel', cuadro(0, 0, 200, 200), nace=3, muere=5)]
    assert not decision(ms, hs, 2)['M']['retirar']
    assert decision(ms, hs, 3)['M']['retirar']
    assert decision(ms, hs, 4)['M']['retirar']
    assert not decision(ms, hs, 5)['M']['retirar']


def test_las_etapas_de_un_hito_se_unen_y_cada_una_rige_en_su_epoca():
    ms = [manzana('M', 0, 0)]
    hs = [hito('cementerio', cuadro(0, 0, 60, 60), nace=3, muere=5), hito('cementerio', cuadro(0, 0, 200, 150), nace=5)]
    assert not decision(ms, hs, 4)['M']['retirar']
    assert decision(ms, hs, 5)['M']['retirar']


def test_se_mide_contra_el_limite_real_con_sus_huecos():
    # el cuadro del plan es de 100 × 100 m, pero el límite real es la mitad oeste: el hito la llena
    ms = [manzana('M', 0, 0, limite=cuadro(0, 0, 100, 200), huecos=[])]
    hs = [hito('casa', cuadro(0, 0, 100, 120))]
    assert decision(ms, hs)['M']['retirar']


def test_una_manzana_sin_hitos_se_conserva_sin_filas():
    ms = [manzana('M', 0, 0), manzana('N', 1000, 1000)]
    hs = [hito('iglesia', cuadro(20, 20, 60, 80))]
    d = decision(ms, hs)
    assert d['N'] == {'id': 'N', 'retirar': False, 'ocupacion': 0, 'hitos': []}
    assert [f['manzana'] for f in solapes(ms, hs, 1, METRO)] == ['M']


def test_un_toque_de_menos_de_un_metro_cuadrado_no_es_un_cruce():
    ms = [manzana('M', 0, 0)]
    hs = [hito('kiosco', cuadro(199, 0, 20, 1.5))]
    assert solapes(ms, hs, 1, METRO) == []


def test_las_filas_traen_las_areas_y_las_fracciones_en_los_dos_sentidos():
    ms = [manzana('M', 0, 0)]
    hs = [hito('templo', cuadro(160, 50, 100, 60), suprime=[cuadro(150, 50, 110, 60)])]
    [f] = solapes(ms, hs, 5, METRO)
    assert (f['epoca'], f['año'], f['hito'], f['manzana']) == (5, 1936, 'templo', 'M')
    assert f['areaManzanaM2'] == 10000 and f['areaHuellaM2'] == 1500 and f['areaRecintoM2'] == 1650
    assert abs(f['manzanaBajoHuella']-.06) < 1e-9 and abs(f['manzanaBajoRecinto']-.075) < 1e-9
    assert abs(f['huellaEnManzana']-.4) < 1e-9 and abs(f['recintoEnManzana']-750/1650) < 1e-9
    assert f['manzanasDelHito'] == 1 and f['clase'] == 'a caballo' and f['decision'] == 'conservar'


def test_no_toca_la_entrada():
    ms = [manzana('M', 0, 0)]
    hs = [hito('palacio', cuadro(10, 10, 180, 180))]
    antes = deepcopy((ms, hs))
    decidir(ms, hs, 1, METRO)
    assert (ms, hs) == antes


def test_los_umbrales_son_los_documentados():
    assert (OCUPA_BUENA_PARTE, CABE, ROCE) == (.5, .75, .1)
