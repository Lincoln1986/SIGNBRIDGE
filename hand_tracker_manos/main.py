#!/usr/bin/env python3
# ============================================
# HAND TRACKER — Detección de manos con la cámara (MediaPipe)
# Versión: SOLO MANOS (v1.0.0)
# ============================================
"""Proyecto: cámara + detector de manos en tiempo real.

Funcionalidades:
  - Dibuja los 21 landmarks de cada mano con colores por dedo
  - Cuenta los dedos levantados
  - Reconoce gestos básicos (puño, palma, paz y amor, OK, etc.)
  - Overlay con FPS, panel de manos y barra de estado

Controles de teclado (con la ventana activa):
  [q] o [ESC]  Salir
  [h]          Mostrar/ocultar landmarks
  [g]          Mostrar/ocultar panel de gestos
  [f]          Mostrar/ocultar FPS
"""

from __future__ import annotations

import argparse
import time

import cv2

from hand_tracker.detector import HandDetector
from hand_tracker.gestures import count_fingers, detect_gesture
from hand_tracker.overlay import FPS, draw_fps, draw_panel, draw_status_bar


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detector de manos con la cámara (MediaPipe HandLandmarker)."
    )
    parser.add_argument(
        "--camera", type=int, default=0,
        help="Índice de la cámara (0 = webcam por defecto, prueba 1 si no abre)",
    )
    parser.add_argument(
        "--max-hands", type=int, default=2,
        help="Máximo de manos a detectar (default: 2)",
    )
    parser.add_argument(
        "--no-mirror", action="store_true",
        help="No reflejar la imagen en espejo (por defecto está espejada)",
    )
    parser.add_argument(
        "--model", default="models/hand_landmarker.task",
        help="Ruta al modelo HandLandmarker (.task)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.max_hands < 1:
        raise SystemExit("--max-hands debe ser al menos 1")

    detector = HandDetector(model_path=args.model, num_hands=min(args.max_hands, 10))

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"[error] No se pudo abrir la cámara {args.camera}.")
        print("        Prueba con:  python main.py --camera 1")
        detector.close()
        return

    show_landmarks = True
    show_panel = True
    show_fps = True

    fps_counter = FPS()
    start = time.perf_counter()

    print("Hand Tracker listo. Controles: [q]/[ESC] salir · [h] landmarks · [g] panel · [f] FPS")
    print("Presiona [q] con la ventana activa para cerrar.")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("[aviso] No se recibieron frames de la cámara.")
                break

            if not args.no_mirror:
                frame = cv2.flip(frame, 1)

            # El timestamp debe ser estrictamente creciente entre frames
            timestamp_ms = int((time.perf_counter() - start) * 1000)
            hands = detector.detect(frame, timestamp_ms)

            # Dedos y gestos para cada mano detectada
            for hand in hands:
                hand.fingers = count_fingers(hand.landmarks)
                hand.gesture = detect_gesture(hand.landmarks, hand.fingers)

            # Dibujo
            if show_landmarks:
                detector.draw(frame, hands)

            fps = fps_counter.update()
            if show_fps:
                draw_fps(frame, fps)
            if show_panel:
                draw_panel(frame, hands)

            draw_status_bar(
                frame,
                {"landmarks": show_landmarks, "panel": show_panel, "fps": show_fps},
            )

            cv2.imshow("Hand Tracker", frame)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):  # q o ESC
                break
            if key == ord("h"):
                show_landmarks = not show_landmarks
            if key == ord("g"):
                show_panel = not show_panel
            if key == ord("f"):
                show_fps = not show_fps
    finally:
        cap.release()
        detector.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
