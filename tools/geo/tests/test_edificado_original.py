"""Lo edificado de cada unidad en el original de 1772: las manchas rojas, para revisar a ojo antes de usarlas."""
import numpy as np
from shapely.geometry import Polygon, box

from edificado_original import ROJO_RGB, edificado_de_unidad, mascara_roja

PAPEL, NEGRO = (225, 215, 190), (40, 35, 30)


def plano():
    """Papel con dos edificios rojos de borde negro: uno dentro de la caja de la unidad y otro fuera."""
    img = np.full((120, 200, 3), PAPEL, np.uint8)
    for x0, y0, x1, y1 in ((20, 20, 60, 50), (140, 60, 180, 100)):
        img[y0 - 1:y1 + 1, x0 - 1:x1 + 1] = NEGRO
        img[y0:y1, x0:x1] = ROJO_RGB
    return img


def test_la_mascara_roja_reconoce_el_rojo_del_original_y_no_el_papel_ni_la_tinta():
    m = mascara_roja(plano())
    assert m[30, 30] and not m[5, 5] and not m[19, 30]


def test_lo_edificado_de_una_unidad_son_las_manchas_rojas_dentro_de_su_caja():
    # Act
    poligonos = edificado_de_unidad(plano(), [10, 10, 80, 60])

    # Assert
    assert len(poligonos) == 1
    p = Polygon(poligonos[0])
    assert p.symmetric_difference(box(20, 20, 60, 50)).area < 0.1 * p.area


def test_una_mancha_que_cae_casi_toda_fuera_de_la_caja_es_de_otra_unidad():
    assert edificado_de_unidad(plano(), [55, 10, 100, 60]) == []   # solo una astilla del edificio de la izquierda


def test_varias_manchas_dentro_de_la_caja_salen_todas():
    img = plano()
    img[20:40, 80:100] = ROJO_RGB
    assert len(edificado_de_unidad(img, [10, 10, 110, 60])) == 2


def registro(poligonos):
    import hashlib, json
    return {'unidad': 'U1', 'poligonos': poligonos,
            'poligonos_sha256': hashlib.sha256(json.dumps(poligonos).encode()).hexdigest(),
            'recorte': {'archivo_local': 'edificado/U1.png', 'sha256': 'r' * 64}}


def test_solo_lo_revisado_como_fiel_y_con_los_mismos_hashes_entra():
    from edificado_original import edificado_aprobado
    poligonos = [[[0, 0], [10, 0], [10, 10]], [[20, 20], [21, 20], [21, 21]]]
    original = {'unidades': [registro(poligonos)]}
    r = original['unidades'][0]
    revision = lambda juicio, **x: {'revisiones': [{'unidad': 'U1', 'juicio': juicio, 'recorte_sha256': r['recorte']['sha256'],
                                                    'poligonos_sha256': r['poligonos_sha256'], **x}]}
    assert edificado_aprobado(original, revision('fiel')) == {'U1': poligonos}
    assert edificado_aprobado(original, revision('fiel_solo_la_mayor')) == {'U1': [poligonos[0]]}
    assert edificado_aprobado(original, revision('dudoso')) == {}
    cambiado = revision('fiel'); cambiado['revisiones'][0]['poligonos_sha256'] = 'x' * 64
    assert edificado_aprobado(original, cambiado) == {}      # el trazado cambió después de revisarlo: no vale


def test_un_juicio_desconocido_se_rechaza():
    import pytest
    from edificado_original import edificado_aprobado
    original = {'unidades': [registro([[[0, 0], [1, 0], [1, 1]]])]}
    r = original['unidades'][0]
    with pytest.raises(ValueError):
        edificado_aprobado(original, {'revisiones': [{'unidad': 'U1', 'juicio': 'me_parece', 'recorte_sha256': 'r' * 64,
                                                      'poligonos_sha256': r['poligonos_sha256']}]})
