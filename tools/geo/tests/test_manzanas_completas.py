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
