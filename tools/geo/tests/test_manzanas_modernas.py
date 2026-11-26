from shapely.geometry import Polygon, box
from manzanas_modernas import referencias, preparar


def datos(hs):
    return {'vertices':[v for p in hs for xy in list(p.exterior.coords)[:-1] for v in xy],
            'techos':[[i*4,4,1,0,0] for i in range(len(hs))], 'vida':[[4,0] for _ in hs]}


def test_no_une_manzanas_a_traves_de_calles_ni_ocupa_cara_vacia():
    ds=datos([box(5,5,45,45),box(55,5,95,45)])
    refs=referencias(ds,4,[box(0,0,50,50),box(50,0,100,50),box(110,0,160,50)],1)
    assert len(refs)==2
    assert all(not Polygon(r['poligono']).intersects(box(47,0,53,50)) for r in refs)


def test_no_reurbaniza_el_nucleo_heredado_y_retrae_solo_la_expansion():
    heredada={'id':'vieja','poligono':[[5,5],[45,5],[45,45],[5,45]]}
    ds=datos([box(5,5,45,45),box(65,5,105,45)])
    r=preparar(ds,[heredada],[],[box(0,0,50,50),box(60,0,110,50)],4,1)
    assert len(r['manzanas'])==1
    m=r['manzanas'][0]
    assert m['retiroAplicadoM']==1
    assert Polygon(m['limite']).bounds==(66,6,104,44)


def test_indice_de_ocupacion_conserva_el_resultado_del_selector():
    from ampliacion_manzanas import seleccionar_ampliacion
    refs = [{'id':str(i), 'poligono':list(box(i*12,0,i*12+18,20).exterior.coords)[:-1],
             'estado':'extraida','ocupacion':'edificada'} for i in range(150)]
    heredadas=[{'id':'vieja','poligono':list(box(-30,0,-10,20).exterior.coords)[:-1]}]
    normal=seleccionar_ampliacion(refs,heredadas,[],1,5,'extraida')
    rapido=seleccionar_ampliacion(refs,heredadas,[],1,5,'extraida',indexar_ocupacion=True)
    assert rapido['cobertura']==normal['cobertura']
    assert len(rapido['manzanas'])==len(normal['manzanas'])
    for a,b in zip(rapido['manzanas'],normal['manzanas']):
        assert a['id']==b['id']
        assert Polygon(a['limite']).equals(Polygon(b['limite']))
        assert abs(a['areaM2']-b['areaM2'])<1e-8


def test_retiro_no_convierte_una_franca_delgada_en_manzana_residencial():
    # Una franja de 3 m deja solo 1 m tras retirar ambos lados: no caben casa y árbol.
    ds=datos([box(10,10,110,13)])
    r=preparar(ds,[],[],[],5,1)
    assert r['manzanas']==[]
    assert r['cobertura'][0]['estado']=='sin_area_nueva_util'
    assert r['descartadasTrasRetiro'][0]['motivo']=='sin espacio útil después del retiro'
