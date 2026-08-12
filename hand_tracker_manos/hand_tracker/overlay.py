# ============================================
# OVERLAY — Información en pantalla (FPS, panel, barra de estado)
# ============================================
"""Dibuja el FPS, el panel de manos y la barra de estado sobre el frame."""

from __future__ import annotations

import time

import cv2

from .detector import Hand

FONT = cv2.FONT_HERSHEY_SIMPLEX
GREEN = (0, 255, 0)
CYAN = (255, 255, 0)
WHITE = (255, 255, 255)
GRAY = (150, 150, 150)


class FPS:
    """Calcula los fotogramas por segundo con una ventana deslizante."""

    def __init__(self, window: int = 30) -> None:
        self.window = window
        self._times: list[float] = []
        self.fps = 0.0

    def update(self) -> float:
        """Llama una vez por frame; devuelve el FPS actual."""
        now = time.time()
        self._times.append(now)
        if len(self._times) > self.window:
            self._times.pop(0)
        if len(self._times) > 1:
            elapsed = self._times[-1] - self._times[0]
            self.fps = (len(self._times) - 1) / elapsed if elapsed > 0 else 0.0
        return self.fps


def draw_fps(frame, fps: float) -> None:
    """FPS en la esquina superior izquierda."""
    cv2.putText(frame, f"FPS: {fps:4.0f}", (10, 28), FONT, 0.9, GREEN, 2, cv2.LINE_AA)


def draw_panel(frame, hands: list[Hand]) -> None:
    """Muestra por cada mano: lado, confianza, gesto y dedos levantados."""
    x, y = 10, 60
    for i, hand in enumerate(hands):
        lado = "Derecha" if hand.handedness == "Right" else "Izquierda"
        lines = [
            f"Mano {i + 1}  {lado}  ({hand.confidence:.0%})",
            f"Gesto: {hand.gesture}",
            f"Dedos: {sum(hand.fingers)}",
        ]
        for line in lines:
            cv2.putText(frame, line, (x, y), FONT, 0.6, CYAN, 2, cv2.LINE_AA)
            y += 22
        y += 12
    if not hands:
        cv2.putText(frame, "No hay manos en cuadro", (x, y), FONT, 0.6, GRAY, 2, cv2.LINE_AA)


def draw_status_bar(frame, toggles: dict[str, bool], bar_height: int = 34) -> None:
    """Barra inferior semitransparente con los toggles activos y los atajos."""
    h, w = frame.shape[:2]

    overlay = frame.copy()
    cv2.rectangle(overlay, (0, h - bar_height), (w, h), (0, 0, 0), -1)
    frame[:] = cv2.addWeighted(overlay, 0.55, frame, 0.45, 0)

    status = "  ".join(
        f"[{label.upper()}:{'ON' if on else 'OFF'}]" for label, on in toggles.items()
    )
    cv2.putText(frame, status, (10, h - 12), FONT, 0.55, GREEN, 2, cv2.LINE_AA)

    keys = "Q/ESC salir   H landmarks   G panel   F FPS"
    (tw, _), _ = cv2.getTextSize(keys, FONT, 0.55, 2)
    cv2.putText(frame, keys, (w - tw - 10, h - 12), FONT, 0.55, WHITE, 2, cv2.LINE_AA)
