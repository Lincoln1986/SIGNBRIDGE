"""Modelo entrenado del abecedario (app/services/abecedario_modelo.py).

Las manos se arman con las coordenadas de una imagen, como las entrega
MediaPipe: la y crece hacia abajo, así que los dedos estirados quedan con y
más pequeña que los nudillos.
"""
from types import SimpleNamespace

import pytest

from app.core.config import get_settings
from app.services import abecedario_modelo as modelo

_X = {"indice": -0.3, "medio": 0.0, "anular": 0.2, "menique": 0.3}
_BASE = {"indice": 5, "medio": 9, "anular": 13, "menique": 17}


def mano(extendidos=()):
    """21 puntos (x, y, z) de una mano de frente, con los dedos pedidos estirados."""
    p = [SimpleNamespace(x=0.0, y=0.0, z=0.0) for _ in range(21)]
    pulgar = [(-0.15, -0.3), (-0.25, -0.5), (-0.3, -0.65), (-0.25, -0.75)]
    for i, (x, y) in enumerate(pulgar, start=1):
        p[i] = SimpleNamespace(x=x, y=y, z=0.0)
    for dedo, base in _BASE.items():
        x = _X[dedo]
        punta = -1.9 if dedo in extendidos else -1.1
        for paso, y in enumerate((-1.0, -1.4, -1.6, punta)):
            p[base + paso] = SimpleNamespace(x=x, y=y, z=0.0)
    return p


@pytest.fixture(autouse=True)
def modelo_prendido(monkeypatch):
    """Cada prueba empieza con el modelo prendido y sin cargar."""
    monkeypatch.setattr(get_settings(), "ABECEDARIO_MODELO", True)
    monkeypatch.setattr(modelo, "_modelo", None)
    monkeypatch.setattr(modelo, "_letras", None)
    monkeypatch.setattr(modelo, "_intento_fallido", False)


# ── El modelo real ───────────────────────────────────────────────────────────

@pytest.mark.parametrize(("extendidos", "letra"), [
    (("indice", "medio", "anular", "menique"), "B"),
    (("menique",), "I"),
    (("indice", "medio", "anular"), "W"),
])
def test_el_modelo_entrenado_reconoce_letras(extendidos, letra):
    resultado, confianza = modelo.clasificar_letra(mano(extendidos))

    assert resultado == letra
    assert modelo.UMBRAL_CONFIANZA <= confianza <= 1
    assert modelo.usa_modelo() is True


def test_el_modelo_tiene_25_letras_sin_j_ni_z():
    modelo._cargar()

    assert len(modelo._letras) == 25
    assert "J" not in modelo._letras and "Z" not in modelo._letras


def test_el_vector_tiene_las_83_medidas_del_entrenamiento():
    assert modelo._vector(mano(("indice",))).shape == (83,)


def test_el_tamano_de_la_mano_no_cambia_el_vector():
    """Cerca o lejos de la cámara es la misma seña."""
    grande = [SimpleNamespace(x=p.x * 3, y=p.y * 3, z=0.0) for p in mano(("indice",))]

    assert modelo._vector(grande) == pytest.approx(modelo._vector(mano(("indice",))), abs=1e-5)


# ── Casos en los que no hay letra ────────────────────────────────────────────

def test_sin_21_puntos_no_hay_letra():
    assert modelo.clasificar_letra(mano()[:20]) == (None, None)
    assert modelo.clasificar_letra(None) == (None, None)


def test_una_mano_de_tamano_cero_no_hay_letra():
    punto = [SimpleNamespace(x=0.5, y=0.5, z=0.0) for _ in range(21)]

    assert modelo.clasificar_letra(punto) == (None, None)


def test_con_poca_confianza_no_hay_letra(monkeypatch):
    modelo._cargar()
    dudoso = SimpleNamespace(predict_proba=lambda _: [[0.5, 0.5] + [0.0] * 23])
    monkeypatch.setattr(modelo, "_modelo", dudoso)

    assert modelo.clasificar_letra(mano(("indice",))) == (None, None)


def test_si_el_modelo_falla_al_predecir_no_hay_letra(monkeypatch):
    modelo._cargar()

    def explota(_):
        raise RuntimeError("modelo roto")

    monkeypatch.setattr(modelo, "_modelo", SimpleNamespace(predict_proba=explota))

    assert modelo.clasificar_letra(mano(("indice",))) == (None, None)


# ── Cuándo se usan las reglas geométricas ────────────────────────────────────

def test_apagado_por_configuracion_usa_las_reglas(monkeypatch):
    monkeypatch.setattr(get_settings(), "ABECEDARIO_MODELO", False)
    monkeypatch.setattr(modelo.abecedario, "clasificar_letra", lambda _: ("REGLAS", 1.0))

    assert modelo.clasificar_letra(mano()) == ("REGLAS", 1.0)
    assert modelo.usa_modelo() is False


def test_sin_el_archivo_usa_las_reglas(monkeypatch, tmp_path):
    monkeypatch.setattr(modelo, "RUTA_MODELO", tmp_path / "no-existe.pkl")
    monkeypatch.setattr(modelo.abecedario, "clasificar_letra", lambda _: ("REGLAS", 1.0))

    assert modelo.clasificar_letra(mano()) == ("REGLAS", 1.0)


def test_un_modelo_cambiado_no_se_carga(monkeypatch, tmp_path):
    """OWASP A08: cargar un pickle ejecuta código. Si la huella no coincide,
    no se carga."""
    falso = tmp_path / "modelo_abecedario.pkl"
    falso.write_bytes(b"un pickle que alguien cambio")
    monkeypatch.setattr(modelo, "RUTA_MODELO", falso)
    cargo = []
    monkeypatch.setattr("joblib.load", lambda *_: cargo.append(True))

    assert modelo._cargar() is False
    assert cargo == []


def test_si_no_carga_no_lo_vuelve_a_intentar_en_cada_frame(monkeypatch, tmp_path):
    monkeypatch.setattr(modelo, "RUTA_MODELO", tmp_path / "no-existe.pkl")
    modelo._cargar()
    monkeypatch.setattr(modelo, "RUTA_MODELO", modelo.RUTA_MODELO.with_name("otro.pkl"))
    huellas = []
    monkeypatch.setattr(modelo, "_huella", lambda r: huellas.append(r))

    assert modelo._cargar() is False
    assert huellas == []


def test_la_huella_del_archivo_es_la_esperada():
    """Si alguien reentrena el modelo, este test le recuerda actualizar SHA256_MODELO."""
    assert modelo._huella(modelo.RUTA_MODELO) == modelo.SHA256_MODELO
