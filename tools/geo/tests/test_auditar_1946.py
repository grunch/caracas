from copy import deepcopy
import pytest
from auditar_1946 import auditar

def ejemplo():
    base={k:[] for k in ['vertices','techos','vida','historia','marcos','alas','vuelos','paletas']}
    nuevo=deepcopy(base)
    nuevo.update(vertices=[0,0,10,0,10,10,0,10],techos=[[0,4,1,0,1]],vida=[[6,0]])
    return base,nuevo

def test_certifica_solo_casas_nuevas_desde_1946():
    base,nuevo=ejemplo()
    assert auditar(base,nuevo)['casasNuevas']==1
    nuevo['vida'][0][0]=5
    with pytest.raises(AssertionError,match='vida'):auditar(base,nuevo)

def test_rechaza_vida_ausente_y_prefijos_modificados():
    base,nuevo=ejemplo();nuevo['vida']=[]
    with pytest.raises(AssertionError,match='vida'):auditar(base,nuevo)
    base,nuevo=ejemplo();base['vertices']=[1,1]
    with pytest.raises(AssertionError):auditar(base,nuevo)
