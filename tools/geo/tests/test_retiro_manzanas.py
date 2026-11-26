import pytest
from shapely.geometry import Polygon
from retiro_manzanas import retraer

def test_retiro_en_metros_conserva_id_semilla_y_reservas():
    m={'id':'A','poligono':[[0,0],[200,0],[200,200],[0,200]],'semilla':'A','cantidadCasas':8,'reservas':[{'id':'hito','poligono':[[5,5],[10,5],[10,10],[5,10]]}]}
    r=retraer([m],1,.5)[0]
    assert Polygon(r['limite']).bounds==pytest.approx((2,2,198,198))
    assert r['reservas']==m['reservas'] and r['semilla']=='A' and r['cantidadCasas']==8
    assert m['poligono'][0]==[0,0]

def test_no_colapsa_solares_pequenos_y_cero_es_identidad():
    m={'id':'chica','poligono':[[0,0],[4,0],[4,4],[0,4]]}
    r=retraer([m],1,1)[0]
    assert r['retiroAplicadoM']==0 and r['limite']==m['poligono']
    assert retraer([m],0,1)[0]['poligono']==m['poligono']

def test_dos_manzanas_ganan_dos_metros_entre_ellas():
    ms=[{'id':str(x),'poligono':[[x,0],[x+100,0],[x+100,100],[x,100]]} for x in [0,106]]
    a,b=retraer(ms,1,1)
    assert Polygon(a['limite']).distance(Polygon(b['limite']))==pytest.approx(8)
