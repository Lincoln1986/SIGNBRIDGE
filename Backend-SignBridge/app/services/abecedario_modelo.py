"""Clasificación del abecedario dactilológico con un modelo entrenado.

Reemplaza las reglas geométricas de `abecedario.py` por un clasificador SVM
entrenado con el dataset LSC70 de la Universidad del Cauca (70 voluntarios,
DOI 10.17632/9ssyn8tff5.2). En la medición del equipo acertó el 91.5 % de las
letras de 14 personas que el modelo nunca vio al entrenar.

Tiene la misma firma que `abecedario.clasificar_letra`, así que el resto del
backend no cambia. Si el modelo no se puede usar (falta el archivo, no coincide
su huella o está apagado con ABECEDARIO_MODELO=false), se usan las reglas
geométricas de siempre: la seña a texto nunca se queda sin clasificador.

No reconoce J, Ñ ni Z: en LSC se hacen con movimiento y no se distinguen en
una sola foto.

── Seguridad (OWASP A08) ─────────────────────────────────────────────────────
El modelo es un pickle, y cargar un pickle ejecuta código. Por eso solo se
carga el archivo del repositorio y solo si su SHA-256 es exactamente el
esperado: si alguien lo cambia, no se carga.
"""

import hashlib
import logging
from pathlib import Path
from typing import Optional, Tuple

import numpy as np

from app.core.config import get_settings
from app.services import abecedario

logger = logging.getLogger(__name__)

RUTA_MODELO = Path(__file__).resolve().parents[1] / "ml" / "modelo_abecedario.pkl"

# Huella del modelo entrenado. Si se reentrena, se actualiza aquí en el mismo PR.
SHA256_MODELO = "f2a3a5c20d53403164bec14b884145f9454509648db51699336af779d0a92f1c"

# Por debajo de esta confianza no se devuelve letra (la mano está a medio
# camino entre dos señas).
UMBRAL_CONFIANZA = 0.55

# Puntas y nudillos de cada dedo en MediaPipe Hands.
TIPS = [4, 8, 12, 16, 20]
MCP = [2, 5, 9, 13, 17]

_modelo = None
_letras = None
_intento_fallido = False


def _huella(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def _cargar() -> bool:
    """Carga el modelo una sola vez. Devuelve False si no se puede usar."""
    global _modelo, _letras, _intento_fallido
    if _modelo is not None:
        return True
    if _intento_fallido:
        return False
    try:
        if not RUTA_MODELO.exists():
            raise FileNotFoundError(RUTA_MODELO)
        if _huella(RUTA_MODELO) != SHA256_MODELO:
            raise ValueError("la huella SHA-256 del modelo no coincide")
        import joblib
        paquete = joblib.load(RUTA_MODELO)
        _modelo, _letras = paquete["modelo"], list(paquete["letras"])
        logger.info("Modelo de abecedario cargado (%s, %d letras)",
                    paquete.get("tipo", "?"), len(_letras))
        return True
    except Exception:
        logger.exception("No se pudo cargar el modelo de abecedario; se usan las reglas")
        _intento_fallido = True
        return False


def _vector(landmarks) -> Optional[np.ndarray]:
    """Convierte 21 puntos en las mismas 83 medidas del entrenamiento.

    63 son las coordenadas centradas en la muñeca y escaladas al tamaño de la
    mano (así no importa qué tan cerca esté de la cámara); las otras 20 son
    distancias entre puntas de dedos, de cada punta a la muñeca y de cada
    punta a su nudillo.
    """
    pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks], dtype=np.float32)
    pts = pts - pts[0]
    escala = np.linalg.norm(pts, axis=1).max()
    if escala < 1e-6:
        return None
    pts = pts / escala

    extra = []
    for i in range(5):
        for j in range(i + 1, 5):
            extra.append(np.linalg.norm(pts[TIPS[i]] - pts[TIPS[j]]))
    for i in range(5):
        extra.append(np.linalg.norm(pts[TIPS[i]] - pts[0]))
        extra.append(np.linalg.norm(pts[TIPS[i]] - pts[MCP[i]]))

    return np.concatenate([pts.flatten(), np.array(extra, dtype=np.float32)])


def usa_modelo() -> bool:
    """True si la clasificación va por el modelo entrenado y no por las reglas."""
    return get_settings().ABECEDARIO_MODELO and _cargar()


def clasificar_letra(landmarks) -> Tuple[Optional[str], Optional[float]]:
    if not usa_modelo():
        return abecedario.clasificar_letra(landmarks)

    if landmarks is None or len(landmarks) < 21:
        return None, None
    vec = _vector(landmarks)
    if vec is None:
        return None, None

    try:
        probas = _modelo.predict_proba(vec.reshape(1, -1))[0]
    except Exception:
        logger.exception("Fallo al predecir la letra")
        return None, None

    i = int(np.argmax(probas))
    confianza = float(probas[i])
    if confianza < UMBRAL_CONFIANZA:
        return None, None
    return str(_letras[i]), round(confianza, 3)
