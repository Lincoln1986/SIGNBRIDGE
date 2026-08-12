# ============================================
# GESTOS — Contador de dedos y reconocimiento de gestos
# ============================================
"""Lógica de dedos y gestos a partir de los 21 landmarks (en píxeles)."""

from __future__ import annotations

import math

from .detector import FINGER_JOINTS

# Índices especiales
WRIST = 0
THUMB_TIP = 4
INDEX_TIP = 8
MIDDLE_MCP = 9


def _dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Distancia euclidiana entre dos puntos."""
    return math.hypot(a[0] - b[0], a[1] - b[1])


def count_fingers(landmarks: list[tuple[float, float]]) -> list[bool]:
    """Devuelve [pulgar, índice, medio, anular, meñique] con True si el dedo está levantado.

    Un dedo está extendido si su punta está más lejos de la articulación MCP
    que la articulación PIP. Usar distancias (en vez de comparar coordenadas)
    hace el cálculo invariante a la rotación de la mano.
    """
    fingers: list[bool] = []
    for mcp, pip, tip in FINGER_JOINTS.values():
        extended = _dist(landmarks[tip], landmarks[mcp]) > _dist(landmarks[pip], landmarks[mcp])
        fingers.append(extended)
    return fingers


# Gesto (tuple de 5 bools [pulgar, índice, medio, anular, meñique]) → nombre
_GESTURE_NAMES = {
    (0, 0, 0, 0, 0): "Puño",
    (1, 0, 0, 0, 0): "Pulgar arriba",
    (0, 1, 0, 0, 0): "Señalando",
    (1, 1, 0, 0, 0): "Dos",
    (0, 1, 1, 0, 0): "Paz y amor",
    (1, 1, 1, 0, 0): "Tres",
    (0, 1, 1, 1, 0): "Tres",
    (0, 1, 1, 1, 1): "Cuatro",
    (1, 1, 1, 1, 0): "Cuatro",
    (1, 1, 1, 1, 1): "Palma abierta",
    (1, 0, 0, 0, 1): "Rock & roll",
    (0, 0, 0, 0, 1): "Meñique arriba",
}


def detect_gesture(landmarks: list[tuple[float, float]], fingers: list[bool]) -> str:
    """Clasifica el gesto de la mano y devuelve su nombre en español."""
    # Caso especial "OK": pulgar e índice casi tocándose con los demás dedos arriba
    hand_size = max(_dist(landmarks[WRIST], landmarks[MIDDLE_MCP]), 1.0)
    if all(fingers[2:]) and _dist(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) < 0.3 * hand_size:
        return "OK"

    key = tuple(1 if f else 0 for f in fingers)
    return _GESTURE_NAMES.get(key, f"{sum(fingers)} dedos")
