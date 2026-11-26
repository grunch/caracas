import sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon, box
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from mapa_1946 import mascara_edificado, casas_de_contorno, conservar_y_ampliar

def test_color_no_confunde_parques_agua_y_curvas_con_manzanas():
    # RGB: amarillo manzana, parque verde, agua azul, curva rojiza, papel.
    rgb=np.array([[[245,230,180],[220,240,120],[175,220,240],[210,140,130],[250,248,240]]],dtype=np.uint8)
    assert mascara_edificado(rgb).tolist()==[[255,0,0,0,0]]

def test_casas_deterministas_dentro_de_contorno_y_sin_pisar_vecinas():
    p=box(0,0,100,80)
    a=casas_de_contorno(p)
    assert a and [q.wkt for q in a]==[q.wkt for q in casas_de_contorno(p)]
    assert all(p.covers(q) for q in a)
    assert all(q.intersection(r).area<.01 for i,q in enumerate(a) for r in a[i+1:])
    assert sum(q.area for q in a)<p.area*.65

def test_preserva_huellas_antiguas_y_no_edifica_reservas():
    bloques=[box(0,0,100,80),box(120,0,220,80),box(240,0,340,80)]
    vieja=box(0,0,15,10)
    nuevas,info=conservar_y_ampliar(bloques,[vieja],[bloques[2]])
    assert info['conservadas']==1
    assert nuevas and all(bloques[1].covers(q) for q in nuevas)
    assert vieja.equals(box(0,0,15,10))
