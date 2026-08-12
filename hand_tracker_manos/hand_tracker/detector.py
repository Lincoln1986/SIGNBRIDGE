# ============================================
# DETECTOR — Detección de manos con MediaPipe Tasks
# ============================================
"""Envuelve el `HandLandmarker` de MediaPipe (API Tasks) para:
- detectar los 21 landmarks de cada mano en un frame de video
- dibujarlos con conexiones y articulaciones de colores

Nota: mediapipe >= 1.0 eliminó la API antigua (`mediapipe.solutions`),
por eso este módulo usa la API moderna de Tasks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

# ---------------------------------------------------------------
# Constantes de la mano
# ---------------------------------------------------------------

# Conexiones entre los 21 landmarks (estándar de MediaPipe)
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),          # pulgar
    (0, 5), (5, 6), (6, 7), (7, 8),          # índice
    (5, 9), (9, 10), (10, 11), (11, 12),     # medio
    (9, 13), (13, 14), (14, 15), (15, 16),   # anular
    (13, 17), (17, 18), (18, 19), (19, 20),  # meñique
    (0, 17),                                 # palma
]

# Articulaciones clave de cada dedo: (MCP, PIP, TIP)
FINGER_JOINTS = {
    0: (2, 3, 4),     # pulgar
    1: (5, 6, 8),     # índice
    2: (9, 10, 12),   # medio
    3: (13, 14, 16),  # anular
    4: (17, 18, 20),  # meñique
}

# Articulación DIP de cada dedo (el pulgar no tiene DIP propio)
FINGER_DIPS = {1: 7, 2: 11, 3: 15, 4: 19}

FINGER_NAMES = ["Pulgar", "Índice", "Medio", "Anular", "Meñique"]

# Colores BGR por dedo
FINGER_COLORS = {
    0: (255, 200, 0),    # pulgar  (azul)
    1: (0, 165, 255),    # índice  (naranja)
    2: (0, 255, 0),      # medio   (verde)
    3: (255, 0, 255),    # anular  (magenta)
    4: (255, 0, 165),    # meñique (rosa)
}
WRIST_COLOR = (200, 200, 200)
PALM_COLOR = (128, 128, 128)

# Mapa: conexión (a, b) -> dedo al que pertenece (para colorear las líneas)
_CONNECTION_FINGER: dict[tuple[int, int], int] = {}
for _finger, (_mcp, _pip, _tip) in FINGER_JOINTS.items():
    if _finger == 0:
        segments = [(0, 1), (1, 2), (2, 3), (3, 4)]
    else:
        _dip = FINGER_DIPS[_finger]
        segments = [(0, _mcp), (_mcp, _pip), (_pip, _dip), (_dip, _tip)]
    for _seg in segments:
        _CONNECTION_FINGER[tuple(sorted(_seg))] = _finger


# ---------------------------------------------------------------
# Modelo de datos
# ---------------------------------------------------------------

@dataclass
class Hand:
    """Resultado de una mano detectada en un frame."""

    landmarks: list[tuple[int, int]]        # 21 puntos (x, y) en píxeles
    handedness: str                         # 'Left' | 'Right' (de la persona)
    confidence: float                       # confianza de la clasificación
    fingers: list[bool] = field(default_factory=list)  # 5 dedos levantados
    gesture: str = ""                       # nombre del gesto detectado


# ---------------------------------------------------------------
# Detector
# ---------------------------------------------------------------

class HandDetector:
    """Detector de manos en tiempo real usando `HandLandmarker` (Tasks API)."""

    def __init__(
        self,
        model_path: str = "models/hand_landmarker.task",
        num_hands: int = 2,
        min_detection: float = 0.5,
        min_presence: float = 0.5,
        min_tracking: float = 0.5,
    ) -> None:
        self.model_path = Path(model_path)
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Modelo no encontrado: {self.model_path}\n"
                "Descárgalo con:\n"
                "  curl -L -o models/hand_landmarker.task "
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
                "hand_landmarker/float16/1/hand_landmarker.task"
            )

        base_options = mp_python.BaseOptions(model_asset_path=str(self.model_path))
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_hands=num_hands,
            min_hand_detection_confidence=min_detection,
            min_hand_presence_confidence=min_presence,
            min_tracking_confidence=min_tracking,
        )
        self.landmarker = vision.HandLandmarker.create_from_options(options)

    # ---------------------------------------------------------------
    def detect(self, frame_bgr, timestamp_ms: int) -> list[Hand]:
        """Detecta las manos en un frame BGR y devuelve una lista de `Hand`.

        `timestamp_ms` debe ser estrictamente creciente entre frames
        (requisito del modo VIDEO de MediaPipe).
        """ 
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.landmarker.detect_for_video(mp_image, timestamp_ms)

        height, width = frame_bgr.shape[:2]
        hands: list[Hand] = []
        for landmarks, handedness in zip(result.hand_landmarks, result.handedness):
            points = [(int(p.x * width), int(p.y * height)) for p in landmarks]
            label = handedness[0].category_name if handedness else "Unknown"
            score = handedness[0].score if handedness else 0.0
            hands.append(Hand(landmarks=points, handedness=label, confidence=score))
        return hands

    # ---------------------------------------------------------------
    def draw(self, frame, hands: list[Hand]) -> None:
        """Dibuja conexiones y articulaciones (modifica `frame` in-place)."""
        for hand in hands:
            pts = hand.landmarks

            # Conexiones (líneas)
            for a, b in HAND_CONNECTIONS:
                finger = _CONNECTION_FINGER.get(tuple(sorted((a, b))))
                color = FINGER_COLORS.get(finger, PALM_COLOR)
                cv2.line(frame, pts[a], pts[b], color, 2, cv2.LINE_AA)

            # Articulaciones (círculos) — cada dedo con su color
            for i, (x, y) in enumerate(pts):
                color = WRIST_COLOR if i == 0 else FINGER_COLORS.get((i - 1) // 4, WRIST_COLOR)
                cv2.circle(frame, (x, y), 5, color, -1, cv2.LINE_AA)
                cv2.circle(frame, (x, y), 5, (255, 255, 255), 1, cv2.LINE_AA)

    # ---------------------------------------------------------------
    def close(self) -> None:
        """Libera los recursos del modelo."""
        self.landmarker.close()
