import pytest
from tools.geo.calles_historicas import completar
from tools.geo.caras import Red


def test_calle_omitida_cierra_dos_cuadras_en_ambas_epocas():
    lineas = [[[0,0],[100,0]], [[100,0],[200,0]], [[200,0],[200,200]],
              [[200,200],[100,200]], [[100,200],[0,200]], [[0,200],[0,0]]]
    tramos = [dict(linea=l, en1936=True, nueva=False) for l in lineas]
    prueba = {'id':'calle', 'anclajes':[[101,0],[99,200]]}
    nuevos = completar(tramos, [prueba], .5)
    assert len(Red(nuevos).caras72) == len(Red(nuevos).caras36) == 2
    assert len(tramos) == 6
    assert completar(nuevos, [prueba], .5) == nuevos


def test_rectifica_la_clasificacion_sin_duplicar_la_calle():
    tramos = [dict(linea=[[0,0],[0,50],[0,100]], en1936=False, nueva=True)]
    nuevos = completar(tramos, [{'id':'calle','anclajes':[[0,0],[0,100]]}], .5)
    assert len(nuevos) == 1 and nuevos[0]['en1936'] and not nuevos[0]['nueva']
    assert tramos[0]['nueva']


def test_un_anclaje_sin_nudo_cercano_no_inventa_una_union():
    with pytest.raises(ValueError, match='anclaje'):
        completar([dict(linea=[[0,0],[100,0]], en1936=True, nueva=False)],
                  [{'id':'lejana','anclajes':[[0,0],[100,100]]}], .5)


def test_una_calle_recuperada_se_anuda_en_un_vertice_intermedio():
    tramos = [dict(linea=[[0,0],[100,0],[200,0]], en1936=True, nueva=False),
              dict(linea=[[0,200],[100,200],[200,200]], en1936=True, nueva=False)]
    nuevos = completar(tramos,[{'id':'recuperada','anclajes':[[100,0],[100,200]]}],.5)
    assert len(nuevos) == 5
    assert sum(t['linea'][0] == [100,0] or t['linea'][-1] == [100,0] for t in nuevos) == 3
