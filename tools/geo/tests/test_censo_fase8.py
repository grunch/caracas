"""El censo final de 1772 (fase 8, T33j.8a): los paneles de cada sector, original y reconstrucción."""
from shapely.geometry import box

from censo_fase8 import extension_de_sectores, leer_calzado, recorte_de


def test_la_extension_de_un_sector_junta_lo_edificado_de_sus_unidades_y_sus_calles():
    edificado = [{'id': 'U1', 'poligonos': [box(10, 10, 20, 20)]}, {'id': 'U2', 'poligonos': [box(100, 100, 110, 130)]}]
    sector_de = {'U1': 'S1', 'U2': 'S2'}
    tramos = [{'tramo': 'L1', 'sector': 'S1', 'puntos': [[0, 15], [40, 15]]},
              {'tramo': 'L2', 'sector': 'S3', 'puntos': [[300, 300], [320, 340]]}]
    ext = extension_de_sectores(edificado, sector_de, tramos)
    assert ext == {'S1': (0, 10, 40, 20), 'S2': (100, 100, 110, 130), 'S3': (300, 300, 320, 340)}


def test_el_recorte_de_un_sector_lleva_margen_y_no_sale_de_la_imagen_calzada():
    # la imagen calzada cubre [1000, 2000] × [500, 1500] del plano base; el margen es de 40 m (80 px a 0,5 m/px)
    assert recorte_de((1100, 600, 1300, 900), (1000, 500, 2000, 1500), metro=0.5, margen_m=40) == (1020, 520, 1380, 980)
    assert recorte_de((990, 480, 1100, 600), (1000, 500, 2000, 1500), metro=0.5, margen_m=40) == (1000, 500, 1180, 680)


def test_el_calzado_rgba_se_lee_en_bgr_sin_cambiar_el_rojo_por_el_azul(tmp_path):
    # calce.py escribe calzado.tif en RGBA (tifffile); el panel lo pinta con OpenCV, en BGR: el rojo del original sigue rojo
    import numpy as np
    import tifffile
    rgba = np.zeros((2, 2, 4), np.uint8)
    rgba[..., 0], rgba[..., 3] = 200, 255          # rojo puro, opaco
    tifffile.imwrite(tmp_path / 'calzado.tif', rgba)
    bgr = leer_calzado(tmp_path / 'calzado.tif')
    assert bgr.shape == (2, 2, 3)
    assert tuple(bgr[0, 0]) == (0, 0, 200)


def test_un_panel_que_no_se_pudo_escribir_falla_con_su_ruta(tmp_path):
    # cv2.imwrite devuelve False (sin excepción) si no puede escribir: el censo no puede seguir como si el panel estuviera
    import numpy as np
    import pytest
    from censo_fase8 import escribir_panel
    ruta = tmp_path / 'no-existe' / 'S1772-11.jpg'
    with pytest.raises(OSError, match='S1772-11.jpg'):
        escribir_panel(ruta, np.zeros((4, 4, 3), np.uint8))
    escribir_panel(tmp_path / 'S1772-11.jpg', np.zeros((4, 4, 3), np.uint8))
    assert (tmp_path / 'S1772-11.jpg').stat().st_size > 0
