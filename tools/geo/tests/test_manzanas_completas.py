from shapely.geometry import Polygon, Point
from manzanas_completas import completar, recortar_y_arbolar


def test_incorpora_todas_las_huellas_aunque_no_haya_referencia():
    d={'vertices':[0,0,80,0,80,80,0,80, 200,0,260,0,260,60,200,60],
       'techos':[[0,4,1,0,1],[4,4,1,0,2]],'vida':[[1,2],[0,0]]}
    r=completar(d,{'manzanas':[]},[],.5)
    assert len(r['manzanas'])==2
    assert r['originales1772']==[0,1]
    assert {i for m in r['manzanas'] for i in m['indicesOriginales']}=={0,1}


def test_arboles_en_todas_variados_reproducibles_y_fuera_de_edificios():
    import copy
    ms=[{'id':f'M{i}','poligono':[[i*250,0],[i*250+200,0],[i*250+200,200],[i*250,200]],'casas':[]} for i in range(12)]
    obstaculos=[[[0,0],[70,0],[70,200],[0,200]]]
    a=recortar_y_arbolar(copy.deepcopy(ms),obstaculos,.5)
    b=recortar_y_arbolar(copy.deepcopy(ms),obstaculos,.5)
    assert a==b
    assert min(len(m['arboles']) for m in a)>0
    assert max(len(m['arboles']) for m in a)>3*min(len(m['arboles']) for m in a)
    for m in a:
        for t in m['arboles']:
            p=Point(t['x'],t['y']).buffer(t['r'])
            assert Polygon(m['poligono']).covers(p)
            assert not p.intersects(Polygon(obstaculos[0]))


def test_abre_un_corral_si_las_casas_no_dejan_espacio_para_un_arbol():
    casas=[{'huella':[[x,0],[x+20,0],[x+20,40],[x,40]],
            'marco':[x,0,1,0,20,40], 'alas':[[2,0,0,20,40]]} for x in [0,20]]
    m={'id':'estrecha','poligono':[[0,0],[40,0],[40,40],[0,40]],'casas':casas}
    r=recortar_y_arbolar([m],[],.5)[0]
    assert r['casas']
    assert r['arboles']
    for t in r['arboles']:
        copa=Point(t['x'],t['y']).buffer(t['r'])
        assert not any(copa.intersects(Polygon(c['huella'])) for c in r['casas'])


def test_los_arboles_respetan_el_techo_estirado_hasta_el_borde_del_lote():
    # Huella sesgada: src/alas.js estira hasta el lindero las alas que lo tocan, así que el techo
    # dibujado cubre también el triángulo más allá de x=20 (revisión de #211).
    from manzanas_completas import techos_de_casa
    c={'huella':[[0,0],[20,0],[30,40],[10,40]],'marco':[0,0,1,0,20,40,0,5],
       'alas':[[2,0,0,20,6],[5,16,6,20,25],[0,4,6,16,25],[1,0,25,20,40]]}
    techo=techos_de_casa(c,.5)
    assert techo.covers(Point(24,22))
    assert not techo.intersects(Point(10,15).buffer(1))  # el patio queda abierto
    assert not techo.intersects(Point(15,35).buffer(1))  # y el solar también


def test_los_arboles_respetan_el_ala_de_esquina_unida_a_inglete():
    # En una esquina, frenteYEsquinas (src/alas.js) da al ala de la otra calle el ancho de la crujía
    # (frente.v1), no el de su rectángulo; y alzado dibuja cada tejado aunque pise un patio (revisión de #211).
    from manzanas_completas import techos_de_casa
    c={'huella':[[0,0],[20,0],[20,40],[0,40]],'marco':[0,0,1,0,20,40,0,6],
       'alas':[[2,0,0,20,6],[6,0,6,4,25],[0,4,6,16,25],[1,0,25,20,40]]}
    techo=techos_de_casa(c,.5)
    assert techo.covers(Point(5,15))
    assert not techo.intersects(Point(11,15).buffer(1))  # el resto del patio queda abierto
    assert not techo.intersects(Point(10,35).buffer(1))  # y el solar también


def test_indice_de_hitos_conserva_arboles_y_casas_del_recorte():
    ms=[{'id':f'M{i}','poligono':[[i*250,0],[i*250+200,0],[i*250+200,200],[i*250,200]],'casas':[]} for i in range(6)]
    obstaculos=[[[0,0],[70,0],[70,200],[0,200]],[[10000,10000],[10100,10000],[10100,10100],[10000,10100]]]
    assert recortar_y_arbolar(ms,obstaculos,.5,indexar_hitos=True)==recortar_y_arbolar(ms,obstaculos,.5)


def test_manzana_sin_casas_cubierta_por_un_hito_queda_sin_arboles():
    # Un pabellón del Hospital Vargas tapa entera una manzana de 1936 que no tiene casas (M5-1048-A0):
    # no hay corral que abrir ni patio que arbolar, y el resto de las manzanas se sigue arbolando.
    cubierta={'id':'cubierta','poligono':[[0,0],[40,0],[40,40],[0,40]],'casas':[]}
    libre={'id':'libre','poligono':[[100,0],[140,0],[140,40],[100,40]],'casas':[]}
    hito=[[-5,-5],[45,-5],[45,45],[-5,45]]
    r=recortar_y_arbolar([cubierta,libre],[hito],.5)
    assert r[0]['arboles']==[] and r[0]['arbolesObjetivo']==0
    assert r[0]['cubiertaPorHito'] is True
    assert r[1]['arboles'] and 'cubiertaPorHito' not in r[1]


def test_manzana_sin_casas_y_sin_hito_que_la_cubra_sigue_siendo_un_error():
    import pytest
    diminuta={'id':'diminuta','poligono':[[0,0],[1,0],[1,1],[0,1]],'casas':[]}
    with pytest.raises(ValueError):
        recortar_y_arbolar([diminuta],[],.5)


def test_un_hito_que_solo_toca_el_borde_de_la_manzana_no_la_cubre():
    import pytest
    diminuta={'id':'diminuta','poligono':[[0,0],[1,0],[1,1],[0,1]],'casas':[]}
    vecino=[[1,0],[5,0],[5,1],[1,1]]  # comparte un lado, no ocupa nada de ella
    with pytest.raises(ValueError):
        recortar_y_arbolar([diminuta],[vecino],.5)


def test_manzana_sin_casas_con_una_franja_donde_no_cabe_un_arbol_queda_sin_arboles():
    # El hito deja libre una franja de 1 m (M5-1064-A0): hay patio, pero ningún árbol cabe en él.
    m={'id':'franja','poligono':[[0,0],[40,0],[40,40],[0,40]],'casas':[]}
    hito=[[2,-5],[45,-5],[45,45],[2,45]]
    r=recortar_y_arbolar([m],[hito],.5)[0]
    assert r['arboles']==[] and r['arbolesObjetivo']==0 and r['cubiertaPorHito'] is True
