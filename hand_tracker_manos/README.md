# ✋ Hand Tracker v1.0.0 — SOLO MANOS

Versión **solo manos** del proyecto (sin detección de cara ni alarma).

Proyecto en **Python** que usa la cámara para detectar manos en tiempo real con
**MediaPipe** (API moderna de Tasks) y **OpenCV**.

## ✨ Funcionalidades

- 🖐️ Dibuja los **21 landmarks** de cada mano con colores por dedo
- 🔢 **Contador de dedos** levantados
- 🤟 **Reconocimiento de gestos**: Puño, Pulgar arriba, Señalando, Paz y amor,
  Tres, Cuatro, Palma abierta, Rock & roll, OK, etc.
- 📊 Overlay con **FPS**, panel por mano (lado, confianza, gesto, dedos) y
  barra de estado con los controles
- 🎛️ Hasta 2 manos a la vez (configurable)

## 📦 Requisitos

- Python 3.10+
- Cámara web
- Internet solo para la primera instalación

## 🚀 Instalación

```bash
cd hand_tracker_manos

# 1. Crear y activar el entorno virtual
python -m venv .venv
# Windows:
.venv\Scripts\activate

# 2. Instalar dependencias
pip install -r requirements.txt
```

> 💡 El modelo `models/hand_landmarker.task` ya viene incluido.

## ▶️ Uso

```bash
python main.py                 # webcam por defecto (índice 0)
python main.py --camera 1      # otra cámara
python main.py --max-hands 1   # una sola mano
python main.py --no-mirror     # sin efecto espejo
```

### Controles (con la ventana activa)

| Tecla      | Acción                              |
|------------|-------------------------------------|
| `q` / `ESC`| Salir                              |
| `h`        | Mostrar/ocultar landmarks           |
| `g`        | Mostrar/ocultar panel de gestos     |
| `f`        | Mostrar/ocultar FPS                 |

## 🗂️ Estructura

```
hand_tracker_manos/
├── main.py                    # Entrada: cámara + loop + controles
├── hand_tracker/
│   ├── detector.py            # HandDetector (MediaPipe Tasks) + dibujo
│   ├── gestures.py            # Contador de dedos + gestos
│   └── overlay.py             # FPS, panel y barra de estado
├── models/
│   └── hand_landmarker.task   # Modelo de manos (7.8 MB)
├── requirements.txt
└── README.md
```

> ℹ️ La versión con **detección de cara + alarma de somnolencia** está en la
> carpeta hermana [`hand_tracker_completo`](../hand_tracker_completo).
