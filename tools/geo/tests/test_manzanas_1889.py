import numpy as np
from manzanas_1889 import contornos_de_mascara
from ampliacion_manzanas import seleccionar_ampliacion

def test_contornos_conservan_calles_huecos_y_coordenadas():
    m=np.zeros((100,180),np.uint8);m[10:90,10:80]=1;m[10:90,100:170]=1;m[30:60,30:60]=0
    refs=contornos_de_mascara(m,(1000,2000),2,1)
    assert len(refs)==2
    assert refs[0]['huecos']
    assert min(p[0] for p in refs[0]['poligono'])==1020
    assert refs[0]['estado']=='extraida'

def test_ampliacion_1889_respeta_huecos_y_reservas_de_su_epoca():
    p=[[0,0],[100,0],[100,100],[0,100]];h=[[30,30],[60,30],[60,60],[30,60]]
    r=seleccionar_ampliacion([{'id':'N','estado':'extraida','ocupacion':'edificada','poligono':p,'huecos':[h]}],[],[{'id':'nuevo','nace':3,'planta':[h]}],1,epoca=3,estado_admitido='extraida')
    assert r['manzanas'][0]['huecos']
    assert r['manzanas'][0]['reservas'][0]['id']=='nuevo'


def test_marco_y_estacion_no_se_convierten_en_casas():
    from manzanas_1889 import recortar_a_zona
    m=np.ones((20,20),np.uint8)
    cfg={'limite':[[104,204],[132,204],[132,232],[104,232]],'exclusiones':[{'poligono':[[110,210],[116,210],[116,216],[110,216]]}]}
    r=recortar_a_zona(m,np.array([100,200]),2,cfg)
    assert r[0,0]==0 and r[4,4]==1 and r[6,6]==0
    assert np.all(m==1)
