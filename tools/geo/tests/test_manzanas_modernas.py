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
