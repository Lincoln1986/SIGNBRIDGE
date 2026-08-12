"""Hand Tracker (v1.0.0 — solo manos): detección de manos en tiempo real con MediaPipe (Tasks API)."""

from .detector import Hand, HandDetector
from .gestures import count_fingers, detect_gesture

__version__ = "1.0.0"
__all__ = [
    "Hand", "HandDetector",
    "count_fingers", "detect_gesture",
    "__version__",
]
